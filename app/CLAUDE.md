# CLAUDE.md — chainfi-webapp

> 這份文件是 Claude Code 的專案說明。每次開始工作前必須先讀完。
> 本專案是獨立 repo，不依賴 chainfi-contracts repo 才能運作。

---

## 專案定位

**鏈信融資平台 — 網站前後端**

- Next.js 14 App Router + TypeScript
- 客戶 Demo 優先：Phase 1 全 Mock 數據，合約部署完後再接真實鏈
- 兩種合約模式：Mock 模式（不需 MetaMask）/ 真實模式（接 Sepolia）
- 模式切換：環境變數 `NEXT_PUBLIC_CONTRACT_MODE`

---

## 資料夾結構

```
chainfi-webapp/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (bank)/
│   │   ├── dashboard/page.tsx
│   │   ├── cases/page.tsx
│   │   ├── cases/[id]/page.tsx
│   │   ├── risk/page.tsx
│   │   ├── chain/page.tsx
│   │   └── alerts/page.tsx
│   ├── (exporter)/
│   │   ├── apply/page.tsx
│   │   ├── applications/page.tsx
│   │   ├── status/[id]/page.tsx
│   │   └── kyb/page.tsx
│   ├── (importer)/
│   │   ├── payables/page.tsx
│   │   └── limits/page.tsx
│   ├── (researcher)/
│   │   └── page.tsx
│   ├── (admin)/
│   │   ├── page.tsx
│   │   ├── users/page.tsx
│   │   ├── thresholds/page.tsx
│   │   ├── contracts/page.tsx
│   │   ├── demo-data/page.tsx
│   │   ├── ai-config/page.tsx
│   │   ├── audit-log/page.tsx
│   │   └── health/page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   ├── dashboard/route.ts
│   │   │   ├── risk/route.ts
│   │   │   ├── case/route.ts
│   │   │   └── alerts/route.ts
│   │   ├── mock/
│   │   │   ├── cases/route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── chain/route.ts
│   │   │   ├── alerts/route.ts
│   │   │   └── risk/[companyId]/route.ts
│   │   ├── contracts/
│   │   │   ├── verify-hash/route.ts
│   │   │   ├── mint/route.ts
│   │   │   └── identity/route.ts
│   │   ├── admin/
│   │   │   ├── users/route.ts
│   │   │   ├── thresholds/route.ts
│   │   │   ├── audit-log/route.ts
│   │   │   └── health/route.ts
│   │   └── bank/
│   │       └── [placeholder]/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui 基礎元件
│   ├── shared/                # Nav、RoleSwitch、DemoBadge
│   ├── dashboard/
│   ├── cases/
│   ├── risk/
│   ├── chain/
│   ├── alerts/
│   ├── exporter/
│   ├── importer/
│   └── admin/
├── lib/
│   ├── contracts/
│   │   ├── index.ts           # 統一出口：依模式切換 mock 或 real
│   │   ├── mock.ts            # Mock 合約互動實作
│   │   └── real.ts            # 真實 Sepolia 合約互動實作
│   ├── wagmi.ts               # Wagmi 設定（僅 real 模式載入）
│   ├── anthropic.ts           # Claude client（server-only）
│   └── scoring/
│       └── ruleEngine.ts      # 固定規則評分邏輯
├── data/                      # 🔵 所有 Mock 數據
│   ├── mockCases.ts
│   ├── mockStats.ts
│   ├── mockChain.ts
│   ├── mockAlerts.ts
│   ├── mockRisk.ts
│   └── mockUsers.ts
├── types/
│   ├── case.ts
│   ├── risk.ts
│   ├── chain.ts
│   ├── user.ts
│   └── admin.ts
├── hooks/
│   ├── useRole.ts
│   ├── useContract.ts         # 依 CONTRACT_MODE 自動選擇實作
│   └── useAdmin.ts
├── docs/
│   ├── PRD_v1.2.docx          # 產品需求文件
│   ├── DESIGN.md              # 設計規格
│   ├── changes/               # 需求變更記錄（每次修改前必須建立）
│   │   └── YYYYMMDD_需求名稱.md
│   └── meetings/              # 會議記錄
├── .env.example
├── .env.local                 # 本地設定（不進 git）
├── CLAUDE.md                  # 本文件
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 合約模式切換（最重要）

### 環境變數控制

```bash
# .env.local
NEXT_PUBLIC_CONTRACT_MODE=mock    # mock | real
```

### 切換邏輯

```typescript
// lib/contracts/index.ts
// 這個檔案是所有合約互動的統一出口
// 依 NEXT_PUBLIC_CONTRACT_MODE 決定用哪個實作
// 不要在元件裡直接 import mock.ts 或 real.ts

import { mockContracts } from './mock'
import { realContracts } from './real'

export const contracts =
  process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'
    ? realContracts
    : mockContracts
```

### Mock 模式行為（`CONTRACT_MODE=mock`）

- 所有合約呼叫回傳模擬數據
- 不需要 MetaMask / 錢包連接
- Hash 驗證：隨機回傳「已存在」或「成功登錄」
- 鑄造代幣：回傳假的 tx hash（`0xMOCK_TX_...`）
- Demo 時預設使用此模式

### 真實模式行為（`CONTRACT_MODE=real`）

- 使用 wagmi + viem 連接 Sepolia
- 需要 MetaMask 且切換到 Sepolia 網路
- 合約地址從環境變數讀取
- 真實 tx hash 顯示在 Etherscan

### 合約地址設定（`real` 模式才需要）

```bash
# 合約部署完後從 chainfi-contracts/deployments/sepolia.json 複製
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_IDENTITY_REGISTRY=0x...
NEXT_PUBLIC_COMPLIANCE_ADDRESS=0x...
NEXT_PUBLIC_HASH_REGISTRY=0x...
NEXT_PUBLIC_RECEIVABLE_NFT=0x...
```

---

## 開發規則

### 1. Mock 數據規則

- 所有 Mock 數據在 `/data/` 資料夾
- 每個檔案第一行必須有：
  ```typescript
  // 🔵 MOCK DATA — 替換說明見下方 TODO
  ```
- 每個需要替換的函數加 TODO：
  ```typescript
  // TODO（正式版）：替換為真實 API 呼叫
  // 真實來源：POST /api/bank/cases
  // 替換時機：CONTRACT_MODE=real 且後端 API 就緒
  ```
- Mock 數據的 interface 必須包含 `isMock: true`

### 2. API Key 規則（絕對不能違反）

```
AI provider API key（ANTHROPIC_API_KEY / OPENROUTER_API_KEY / EXA_API_KEY）
                  → 只能在 /app/api/ai/* 的 Route Handler 或 lib/ai/*、lib/anthropic.ts 使用
                  → 絕對不能出現在任何 'use client' 元件
                  → 絕對不能是 NEXT_PUBLIC_ 前綴
```

### 3. 合約互動規則

```
所有合約互動 → 透過 lib/contracts/index.ts
不可直接 import → lib/contracts/mock.ts 或 real.ts
不可 hardcode 合約地址 → 必須從環境變數讀取
```

### 4. 型別規則

```
不允許 any → 除非有明確 TODO 說明原因
所有 API response → 必須有 TypeScript interface
Mock 數據 → 必須符合對應 interface
```

### 5. 錯誤處理規則

```
API Route → 必須有 try-catch
           → 統一回傳 { error: string, code: string }
Claude API 失敗 → 顯示 fallback 靜態內容，不阻斷頁面
Sepolia 失敗 → 自動切回 Mock 模式 + 橘色 Banner
```

### 6. 元件狀態規則

每個資料元件必須處理：
```
loading  → shadcn/ui Skeleton（高度與內容一致）
empty    → 說明文字 + 建議操作按鈕
error    → 紅色 Alert + 重試按鈕
mock     → 左上角藍色「DEMO」標注（DEMO_MODE=true 時顯示）
```

### 7. Admin 規則

```
role: 'admin' 才能進入 /admin/* 路由
所有 Admin 操作 → 必須寫入稽核日誌（/api/admin/audit-log）
破壞性操作（刪除、重置）→ 必須彈出二次確認對話框
稽核日誌 → 不可刪除，只能查看和匯出
```

### 8. 需求變更規則 ⚠️（每次修改前必須執行，不可跳過）

**任何需求變更，在寫任何程式碼之前，必須先完成以下兩個步驟：**

**Step 1 — 建立變更記錄檔案**

```
檔名格式：YYYYMMDD_需求名稱.md
存放位置：docs/changes/
範例：docs/changes/20250515_新增Admin模組.md
```

變更記錄檔案格式：

```markdown
# YYYYMMDD_需求名稱

## 變更摘要
一句話說明這次改了什麼

## 變更內容
- 新增 / 修改 / 刪除的功能項目

## 影響範圍
- 影響哪些頁面 / 元件 / API Route

## 對應 PRD 章節
- Section X 已更新 / 待更新

## 決策依據
- 為什麼要這樣改
```

**Step 2 — 等待 Kenneth 確認**

```
建立檔案後 → 停下來
等 Kenneth 說「確認」或「OK」→ 才能開始寫程式碼
沒有收到確認 → 不執行任何程式碼變更
```

**違規處理：**

```
直接寫程式而未建立變更記錄 → 視為無效操作
Kenneth 有權要求 git revert 所有未經確認的變更
```

---

## 角色與頁面權限

| 頁面 | 銀行 | 出口商 | 進口商 | 研究員 | Admin |
|------|------|--------|--------|--------|-------|
| /dashboard | ✅ | ❌ | ❌ | ✅唯讀 | ✅ |
| /cases | ✅ | ❌ | ❌ | ✅唯讀 | ✅ |
| /risk | ✅ | ❌ | ❌ | ✅唯讀 | ✅ |
| /chain | ✅ | ❌ | ❌ | ✅唯讀 | ✅ |
| /alerts | ✅ | ❌ | ❌ | ✅唯讀 | ✅ |
| /exporter/* | ❌ | ✅ | ❌ | ✅唯讀 | ✅ |
| /importer/* | ❌ | ❌ | ✅ | ✅唯讀 | ✅ |
| /researcher | ❌ | ❌ | ❌ | ✅ | ✅ |
| /admin/* | ❌ | ❌ | ❌ | ❌ | ✅ |

未授權 → 前端攔截，不發 API 請求，顯示「此功能需要 XX 角色權限」

---

## Demo 帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| 銀行企金人員 | bank@chainfi.demo | demo1234 |
| 出口商 | exporter@chainfi.demo | demo1234 |
| 進口商 | importer@chainfi.demo | demo1234 |
| 研究員 | researcher@chainfi.demo | demo1234 |
| 管理員 | admin@chainfi.demo | admin5678 |

定義在 `/data/mockUsers.ts`，Phase 1 用 client-side 驗證。

---

## 環境變數完整清單

```bash
# ── 必填 ──────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxx        # Claude API（server-only）
NEXT_PUBLIC_CONTRACT_MODE=mock        # mock | real

# ── Demo 設定 ──────────────────────────────────
NEXT_PUBLIC_DEMO_MODE=true            # true = 顯示 DEMO 標注
NEXT_PUBLIC_APP_NAME=鏈信融資平台

# ── 合約（CONTRACT_MODE=real 時才需要）────────
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_IDENTITY_REGISTRY=0x...
NEXT_PUBLIC_COMPLIANCE_ADDRESS=0x...
NEXT_PUBLIC_HASH_REGISTRY=0x...
NEXT_PUBLIC_RECEIVABLE_NFT=0x...
```

---

## 不能動的檔案

```
CLAUDE.md              ← 本文件（只有 Kenneth 可以更新）
docs/DESIGN.md         ← 設計規格（只有 Kenneth 可以更新）
docs/changes/          ← 變更記錄（只能新增，不能修改或刪除）
.env.local             ← 本地設定
```

---

## 常見問題

**Q: 要怎麼切換到真實合約模式？**
A: `.env.local` 改 `NEXT_PUBLIC_CONTRACT_MODE=real`，確認合約地址已填入，MetaMask 切到 Sepolia。

**Q: Claude API 超時怎麼辦？**
A: 每個 AI 功能有 fallback 靜態內容，定義在 `/lib/aiFallbacks.ts`。超時自動顯示 fallback，不要 throw error 給使用者。

**Q: 新增功能的檢查清單？**
A: (1) 先建立 docs/changes/YYYYMMDD_需求名稱.md (2) 等 Kenneth 確認 (3) 確認角色權限 (4) 處理四種 UI 狀態 (5) Mock 數據加 TODO (6) API Route 加 try-catch (7) 型別定義在 types/ (8) Admin 操作寫稽核日誌

**Q: 合約地址從哪裡來？**
A: chainfi-contracts repo 部署完後，從 `deployments/sepolia.json` 複製地址到 `.env.local`。

**Q: 變更記錄要寫多詳細？**
A: 能讓人在兩週後看懂「當時為什麼這樣改」就夠了。不需要寫程式碼，只需要說明意圖和影響範圍。

---

*CLAUDE.md v1.1 | chainfi-webapp | 2025年5月*
