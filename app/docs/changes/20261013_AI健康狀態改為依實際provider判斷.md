# 20261013_AI健康狀態改為依實際provider判斷

## 變更摘要
`/admin/health` 與 admin 首頁的「Claude API / AI Provider」狀態原本只檢查 `ANTHROPIC_API_KEY` 是否存在，但實際 AI 走 OpenRouter（案件評估使用 Kimi K2.6），導致線上顯示紅色「down」。改成依目前實際使用的 AI provider 判斷，並讓 AI Settings 頁顯示真實設定。

## 變更內容
- `types/admin.ts`：`SystemHealth` 移除 `claudeApiStatus`、`claudeApiLatencyMs`（後者早已不再填值），改為 `aiStatus: 'ok' | 'down'` 與 `aiProvider: string`（案件評估實際使用的模型標籤，例如 `openrouter:moonshotai/kimi-k2.6`）
- `app/api/admin/health/route.ts`：用 `getCaseAi()` 取得實際 provider 與金鑰是否存在，不再讀 `ANTHROPIC_API_KEY`
- `app/admin/health/page.tsx`：項目名稱改為「AI Assessment」，詳細欄顯示實際模型
- `app/admin/page.tsx`：「AI Provider」卡片顯示實際模型與狀態
- `app/admin/ai-config/page.tsx`：原本是寫死的 `claude-sonnet-4-20250514`、`Max Tokens 1000` 與「ANTHROPIC_API_KEY is set」文字，與實際設定不符；改成讀 `/api/admin/health` 顯示實際 provider/模型與金鑰狀態，移除不實的敘述

## 影響範圍
- `types/admin.ts`
- `app/api/admin/health/route.ts`
- `app/admin/health/page.tsx`
- `app/admin/page.tsx`
- `app/admin/ai-config/page.tsx`
- 不影響 AI 功能本身（案件評估、新聞掃描等）

## 對應 PRD 章節
- 不對應 `Monsoon_App_PRD.md` 既有章節

## 決策依據
- 狀態卡顯示紅色「down」但 AI 實際正常，會誤導評審與使用者；狀態應反映實際使用中的 provider
- AI Settings 頁寫著 Claude 與 ANTHROPIC_API_KEY，與「Kimi 驅動案件評估」的提交內容互相矛盾，必須一併修正
- Kenneth 已確認 ANTHROPIC_API_KEY 未使用，並要求處理
