# 20260802_Exporter申請案件真實API

## 變更摘要
`/api/mock/cases`(GET/POST)與 `/api/mock/cases/[id]`(GET/PATCH)從讀寫靜態 `MOCK_CASES` 陣列,改成真的讀寫 Supabase `cases` 資料表;`/exporter/apply` 表單改為真的呼叫 API 建立案件,不再是純前端展示。

## 變更內容
- `GET /api/mock/cases`:改查 Supabase `cases` 表(支援既有的 `stage`/`riskLevel`/`search` 篩選),回傳格式維持跟現在完全一樣的 `FinanceCase[]`(snake_case 欄位轉回 camelCase)
- `GET /api/mock/cases/[id]`:改查 Supabase(用 `case_number` 對應現有的 `id` 語意,不是 uuid),不存在回 404
- **新增** `POST /api/mock/cases`:Exporter Apply 表單真正送出的目標。輸入 financeType/amount/buyerName/invoiceNo,產生 `case_number`(格式比照現有 `TBC-2024-089` 風格)、計算 `invoice_hash`,寫入 Supabase,`stage` 預設 `submitted`
- `PATCH /api/mock/cases/[id]`:改成真的 `UPDATE cases SET stage = ...`,取代目前只存在記憶體、重啟就消失的 `stageOverrides` Map
- `app/exporter/apply/page.tsx`:第二步「Submit Application」改成真的呼叫上面的 POST,顯示真實 case number,而不是單純切換 `submitted` 這個 local state

## 影響範圍
API 介面(路徑、回傳格式)完全不變,所以以下 9 個既有呼叫點**不需要改動**,只是背後資料來源從假資料換成真資料庫:
- `exporter/apply`(新增送出邏輯)、`exporter/applications`、`exporter/status/[id]`
- `bank/cases`、`bank/cases/[id]`、`bank/dashboard`
- `importer/limits`、`importer/payables`

## 對應 PRD 章節
- 對應待辦 #33(Exporter Apply 表單接上真正的建立案件 API)

## 決策依據
- **`exporter_id`/`buyer_id` 先留空(nullable)**:目前的登入還是 mock 版(sessionStorage + 比對 `MOCK_USERS`),不是真的 Supabase Auth,沒有 `auth.uid()` session 可以歸屬案件的建立者。等之後真的接上 Supabase Auth,再回頭把這兩欄位補上。
- **Server 端一律用 `SUPABASE_SERVICE_ROLE_KEY` 讀寫,繞過 RLS**:因為目前沒有真的 auth session,RLS policy(`current_user_role() = auth.uid() 對應的角色`)在這個階段本來就用不上,先讓功能動起來,權限收斂留給接 Supabase Auth 那一步一起做。
- **API 路徑刻意不改名(仍叫 `/api/mock/cases`)**:雖然已經不是 mock 了,但九個既有呼叫點已經依賴這個路徑跟回傳格式,改名風險大於好處。之後有空可以做一次單純的重新命名。
