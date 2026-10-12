# ChainFi 專案現狀總結報告

> 生成時間：2026-07-11  
> 掃描範圍：`chainfi-webapp`（`E:\Project\2026\chainfi-research\chainfi\chainfi-webapp`）  
> 方法：僅根據 code 與設定檔中實際存在的內容撰寫，不猜測或美化；不確定處標「待確認」

---

## 1. 專案概覽

**一句話**：ChainFi 是一套面向台灣貿易融資場景的 AI + 區塊鏈平台原型，供銀行信貸官、出口商、進口商、研究員、系統管理員五種角色操作，核心功能為融資案件審核、AI 風控評估與鏈上憑證管理。

**專案性質**：**待確認**。從 code 特徵判斷目前處於 PoC / Demo 階段（全部資料為 mock、合約整合為 stub、無部署設定、無 CI/CD），但無法從 code 本身判斷是客戶項目、自有產品還是內部工具。

> ❓待確認問題 1：這是給特定客戶演示用的 PoC，還是對外產品的早期版本？

---

## 2. 技術棧

### 鏈與網路
| 項目 | 值 |
|------|-----|
| 鏈 | Ethereum **Sepolia Testnet** |
| Chain ID | `11155111`（來自 `.env.example`）|
| RPC | `https://sepolia.infura.io/v3/YOUR_KEY`（佔位符，未填入真實 Key）|
| 部署合約地址 | 全為 `0x...` 佔位符，**無任何已部署合約** |
| Solidity 原始碼 | **不在此 repo**（comments 提及「chainfi-contracts」另一個 repo）|

### Token Standard
❌ **此 repo 內無 ERC-20、ERC-3643（T-REX）、ERC-1400 等標準的直接實作或 ABI 引用。**  
`.env.example` 中有 `NEXT_PUBLIC_RECEIVABLE_NFT` 變數名，暗示應收帳款可能設計為 NFT（待確認合約 repo）。

> ❓待確認問題 2：合約 repo（chainfi-contracts）的 Token Standard 設計為何？ERC-3643 或自訂？

### 前後端框架
| 層 | 技術 | 版本 |
|----|------|------|
| 前端框架 | Next.js（App Router）| 16.2.7 |
| UI Runtime | React | 19.2.4 |
| 樣式 | Tailwind CSS | ^4 |
| 元件庫 | shadcn/ui（基底為 `@base-ui/react`，**非 Radix UI**）| ^1.5.0 |
| Toast | sonner | ^2.0.7 |

### 資料庫
- **Supabase**（`@supabase/supabase-js` ^2.107.0，`@supabase/ssr` ^0.10.3）已安裝但**尚未連接**：`.env.local` 中 Supabase URL/Key 為空值，`middleware.ts` 為 no-op passthrough，所有資料來自 in-memory mock。

### 鏈上整合依賴
| 套件 | 版本 | 實際使用狀態 |
|------|------|-------------|
| `viem` | ^2.52.2 | 已安裝，**僅在 TODO 註解中出現，無實際呼叫** |
| `wagmi` | ^3.6.16 | 已安裝，無實際使用 |
| `@rainbow-me/rainbowkit` | ^2.2.11 | 已安裝，無實際使用 |

### 部署方式
**待確認** — 無 `Dockerfile`、無 `vercel.json`、無 CI/CD 設定（`.github/` 不存在）。

---

## 3. 代幣化流程完成度

> 說明：「已完成」= 有真實邏輯運作；「進行中」= UI/框架存在但後端為 stub；「未開始」= 無任何對應 code

### ❌ 資產發行（Issuance）
- `app/api/contracts/mint/route.ts` 存在，但呼叫 `lib/contracts/mock.ts` 的 `mintToken()`——回傳假的 `0x...` txHash，延遲 1200ms 模擬。
- `lib/contracts/real.ts` 的 `mintToken()` 直接 `throw new Error('real 合約模式尚未實作')`。
- 實際上鏈邏輯：**❌ 未開始**。

### ❌ 轉讓限制（Transfer Restrictions / Whitelist）
- 無任何 transfer restriction 的 UI、API 或 lib 邏輯。
- **❌ 未開始**。

### 🔧 KYC / 投資人驗證閘門
- `app/exporter/kyb/page.tsx` 有完整 UI（公司資料、鏈上地址、憑證資訊）。
- `app/api/contracts/identity/route.ts` 存在，呼叫 `lib/contracts/mock.ts` 的 `registerIdentity()`——回傳假 txHash，延遲 1500ms。
- `lib/contracts/real.ts` 的 `registerIdentity()` 同樣 `throw`。
- **🔧 進行中**（UI 完整，鏈上邏輯未實作）。

### ❌ 託管整合（Custody）
- 無任何 custody provider 的整合、SDK 或 API 設定。
- **❌ 未開始**。

### ❌ 贖回（Redemption）
- 無贖回相關 UI 或 API。
- **❌ 未開始**。

### 🔧 鏈上 / 鏈下資料同步
- `app/bank/chain/page.tsx` 顯示鏈上交易記錄，資料來源為 `data/mockChain.ts`（靜態假資料）。
- `app/api/mock/chain/route.ts` 提供資料，無任何真實 RPC 呼叫。
- `app/api/contracts/verify-hash/route.ts` 可驗證 invoice hash，但 mock 實作為 20% 隨機成功。
- **🔧 進行中**（UI 框架存在，資料全為 mock）。

---

## 4. 合規設計

### Code 中實際存在的合規機制

| 機制 | 實作狀態 | 位置 |
|------|---------|------|
| KYB 流程（公司身份驗證）| UI + mock 鏈上呼叫 | `app/exporter/kyb/` |
| Invoice Hash 上鏈驗證 | mock 隨機邏輯 | `app/api/contracts/verify-hash/` |
| 四維度風控評分（財務/鏈上/總體/ESG）| ✅ 規則引擎已實作 | `lib/scoring/ruleEngine.ts` |
| 案件審核多階段流程（submitted→AI→信審→approved）| ✅ 狀態機已定義 | `types/case.ts`、`app/api/mock/cases/` |
| 角色權限閘門 | 僅客戶端 RoleGuard | `components/shared/RoleGuard.tsx` |
| 預警閾值設定 | UI + in-memory，未持久化 | `app/admin/thresholds/`、`app/bank/alerts/` |
| Audit Log | 靜態假資料 | `app/api/admin/audit-log/route.ts` |

### 明顯缺失的合規環節

1. **無 server-side 路由保護**：`middleware.ts` 為 no-op，所有角色管控僅靠 `useEffect` client-side check，可被直接 URL 訪問繞過。
2. **無真實 KYC 整合**（Jumio、Onfido、SumSub 等），目前僅為 UI 表單。
3. **無 AML / 交易監控**邏輯。
4. **無真實 Audit Trail 持久化**：Audit Log 為硬編碼靜態資料，不記錄實際操作。
5. **無投資人適格性檢查**（accredited investor / qualified buyer）。
6. **Transfer restrictions 完全缺失**（見上節）。

---

## 5. 工程品質

### 測試覆蓋

**❌ 零測試**——專案內不存在任何 `*.test.ts`、`*.spec.ts`、`__tests__/` 檔案。所有測試相關檔案僅存在於 `node_modules`。

### 密鑰與敏感資訊管理

| 項目 | 狀態 |
|------|------|
| `ANTHROPIC_API_KEY` | ✅ 正確：僅在 server-side `lib/anthropic.ts` 讀取，無 `NEXT_PUBLIC_` 前綴 |
| `.env.local` 已列入 `.gitignore` | ✅ 已設定 |
| Mock 使用者密碼 | ⚠️ 明文存在 `data/mockUsers.ts`，API 層有 strip，但 source code 本身可見 |
| 合約地址 | 目前皆為佔位符 `0x...`，尚無真實密鑰洩漏風險 |

### 錯誤處理與日誌

- **無全域 React ErrorBoundary**（無 `app/error.tsx`、`app/global-error.tsx`）。
- **無外部日誌服務**（無 Sentry、Datadog 等）。
- **API 層**：所有 route 有 try/catch + `console.error('[tag] ...')`，回傳結構化 JSON error，AI route 故意回傳 HTTP 200 + `isFallback: true` 以避免前端感知錯誤（可接受的 design choice，但掩蓋了 API Key 設定問題）。
- **前端**：`DataWrapper` 元件處理 fetch loading/error 狀態；無 retry 機制。

### 最大三個技術債

**1. 認證 / 授權架構需全面重建**  
目前整套 auth 為 `sessionStorage` mock，無 JWT、無 session token、無 server-side 驗證。進入正式環境前需要用 Supabase Auth（或其他方案）從頭重做，影響幾乎所有頁面。

**2. 合約整合層為空殼**  
`lib/contracts/real.ts` 的四個方法全部 `throw`，`viem`/`wagmi` 雖已安裝但無任何真實呼叫。加上合約 repo 分離，鏈上整合的工作量目前完全不可估計。

**3. 零測試覆蓋，且資料層耦合度高**  
Mock 資料直接散落在 `data/*.ts`，Stage override 存於 in-memory `Map`（重啟即消失），無任何資料庫 schema。切換 Supabase 時需同步重構資料層 + 補寫測試，風險高。

---

## 6. 現狀一句話 + 待辦

### 現狀
> **這是一個功能完整但全部跑在假資料上的互動式 Demo，技術架構已搭好，但鏈上整合、資料庫接入、認證系統三塊核心工程均為零。**

### 接下來最關鍵的 5 個待辦（依優先級）

| 優先級 | 項目 | 理由 |
|--------|------|------|
| P0 | **接入 Supabase Auth，實作 server-side 路由保護** | 現有 auth 完全不安全，是所有後續工作的前提 |
| P1 | **部署合約到 Sepolia，填入真實合約地址** | 需先確認合約 repo 完成度；完成後才能解鎖 `lib/contracts/real.ts` |
| P1 | **實作 `lib/contracts/real.ts`（viem 呼叫）** | KYB 身份注冊、Hash 驗證、Token Mint 三條鏈路需要真實實作 |
| P2 | **接入 Supabase 資料庫，替換 mock 資料層** | 案件、預警、審核記錄需要持久化；須先確認 DB schema 設計 |
| P3 | **補齊基礎測試（API routes + 評分規則引擎）** | `lib/scoring/ruleEngine.ts` 是核心業務邏輯，目前零保護 |

---

## 待確認問題彙整

| # | 問題 |
|---|------|
| 1 | 這是給特定客戶演示的 PoC、還是打算對外發布的產品？ |
| 2 | 合約 repo（chainfi-contracts）的 Token Standard 確定是？（ERC-3643 T-REX / ERC-1400 / 自訂 NFT）|
| 3 | `NEXT_PUBLIC_RECEIVABLE_NFT` — 應收帳款設計為 NFT，是 ERC-721 還是 ERC-1155？ |
| 4 | 合約是否已在 Sepolia 上有任何部署版本（即使是早期版）？ |
| 5 | Supabase 的 DB schema 是否已在別處設計好，還是需要從 mock 資料反推？ |
