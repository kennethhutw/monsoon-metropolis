# 20260805_AI_Provider抽象層與OpenRouter支援

## 變更摘要
把目前寫死呼叫 Anthropic 的 AI 邏輯抽成一個可切換 provider 的統一出口,讓案件風險評估(`/api/ai/case`)與即將上線的新聞掃描摘要(`/api/ai/adverse-media`,見 [[20260805_負面新聞掃描功能]])都能選擇 Claude 或 OpenRouter,之後要加其他 provider 也只改這一層。

## 變更內容

### 1. 新增 `lib/ai/index.ts`(統一出口,比照 `lib/contracts/index.ts` 的 mock/real 切換模式)
```typescript
// 依 AI_PROVIDER 決定用哪個實作,元件/route 一律 import 這裡,
// 不直接 import lib/ai/anthropic.ts 或 lib/ai/openrouter.ts
export const aiClient =
  process.env.AI_PROVIDER === 'openrouter' ? openrouterClient : anthropicClient
```
兩個實作對外提供同一介面,例如 `complete({ system, messages, maxTokens }) => Promise<string>`,route 端不需要知道底層是誰。

### 2. `lib/ai/anthropic.ts`
把現有 `lib/anthropic.ts` 的邏輯搬進來,包成上述統一介面,行為不變。

### 3. `lib/ai/openrouter.ts`(新增)
- OpenRouter 提供 OpenAI 相容的 Chat Completions API(`https://openrouter.ai/api/v1/chat/completions`),用 `fetch` 直接呼叫,不需要額外裝 OpenAI SDK
- 環境變數:`OPENROUTER_API_KEY`(server-only)、`OPENROUTER_MODEL`(例如 `anthropic/claude-sonnet-4`、`openai/gpt-4o` 等,讓 Kenneth 自己選)
- 錯誤處理比照現有模式:呼叫失敗就 throw,由呼叫端(route)接住轉成 fallback,不在這層吞掉

### 4. 改寫既有 route
`app/api/ai/case/route.ts` 改成呼叫 `aiClient.complete(...)`,行為對前端完全無感(回傳格式不變)。

### 5. 環境變數規則要更新(需要 Kenneth 自己動 CLAUDE.md)
目前 [CLAUDE.md](../../CLAUDE.md) 規則 2 寫死:
```
ANTHROPIC_API_KEY → 只能在 /app/api/ai/* 的 Route Handler 使用
```
建議改成:
```
AI provider API key(ANTHROPIC_API_KEY / OPENROUTER_API_KEY)→ 只能在 /app/api/ai/* 的 Route Handler 或 lib/ai/* 使用
                                                          → 絕對不能出現在任何 'use client' 元件
                                                          → 絕對不能是 NEXT_PUBLIC_ 前綴
```
這份文件我不能自己改(規則第 8 條 + 不能動的檔案清單),麻煩 Kenneth 確認後自己更新 CLAUDE.md 那一段。

## 影響範圍
- `lib/ai/`(新資料夾:`index.ts`、`anthropic.ts`、`openrouter.ts`)
- `lib/anthropic.ts`(內容搬移到 `lib/ai/anthropic.ts`,原檔案視情況保留 re-export 或直接刪除)
- `app/api/ai/case/route.ts`
- `app/api/ai/adverse-media/route.ts`(新功能一開始就用這層,見 [[20260805_負面新聞掃描功能]])
- `.env.example`、`.env.local`(新增 `AI_PROVIDER`、`OPENROUTER_API_KEY`、`OPENROUTER_MODEL`)

## 對應 PRD 章節
- 無新增頁面/角色權限異動,屬於後端 AI 呼叫方式的架構調整

## 決策依據
Kenneth 提出可能改用 OpenRouter 而非單靠 Claude,選擇「全部可切換」而非只限新聞掃描功能 —— 這樣案件風險評估未來也能換 provider 或做 A/B,不用之後重做一次抽象層。風險是要改動已經上線在用的 `/api/ai/case` route,但因為對外介面(回傳格式)不變,前端完全不用改,風險可控。
