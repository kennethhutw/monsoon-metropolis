# 20260807_TravelRule合規紀錄

## 變更摘要
撥款(disbursement)、還款(repayment)發生時,自動產生一筆 Travel Rule(FATF Recommendation 16)合規紀錄:金額是否達門檻(US$1,000)、對方客戶(exporter 或 buyer)的 CVI 身份是否已驗證。**明確定位為合規紀錄產生器,不是真的 VASP 間傳輸網路**(真正的 Travel Rule 需要接 Sygna Bridge/Notabene 這類 VASP 網路,不在這次範圍)。

## 資料模型
- 撥款:FinancingPool → Exporter,客戶端是 exporter,查 exporter 錢包的 CVI
- 還款:Buyer → FinancingPool,客戶端是 buyer,查 buyer 錢包的 CVI
- Monsoon FinancingPool(平台/銀行方)視為受規管機構,不需要每筆查驗,只有客戶端(exporter/buyer)需要 CVI 驗證

## 變更內容

### 1. 新增 `travel_rule_records` 表(新 migration)
```sql
create table public.travel_rule_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  event_type text not null,        -- 'disbursement' | 'repayment'
  amount numeric(18, 2) not null,
  applicable boolean not null,     -- amount >= 1000 (USD 門檻)
  customer_role text not null,     -- 'exporter' | 'buyer'
  customer_wallet text not null,
  customer_name text,
  customer_cvi_verified boolean not null,
  compliant boolean not null,      -- !applicable || customer_cvi_verified
  tx_hash text not null,
  created_at timestamptz not null default now()
);
```
RLS 開啟、無 client 政策,比照 `case_news_scans`。

### 2. 新增 API:`app/api/travel-rule/route.ts`
- `POST`:`{ caseNumber, eventType, amount, txHash, customerRole, customerWallet, customerName }` → 查該錢包即時 CVI 驗證狀態(重用 `lib/contracts` 的 `isVerified`)→ 算 `applicable`/`compliant` → 寫入一筆紀錄
- `GET ?caseNumber=`:回傳該案件所有紀錄

### 3. 觸發時機(不是新按鈕,搭已有的成功流程)
- `app/bank/cases/[id]/page.tsx` 的 `handleDisburse` 撥款成功後,呼叫上面的 POST(`eventType: 'disbursement'`, `customerRole: 'exporter'`)
- `app/importer/payables/page.tsx` 的 `handleRepay` 還款成功後,呼叫 POST(`eventType: 'repayment'`, `customerRole: 'buyer'`)

### 4. 顯示:`bank/cases/[id]` 新增「Travel Rule Compliance」卡片
列出該案件所有紀錄:事件類型、金額、是否適用門檻、客戶 CVI 驗證狀態、合規與否(綠/紅),點 tx hash 連 Explorer。

## 已知限制
- 不是真的 VASP 間傳輸,只是合規資料包的產生與紀錄,demo 時要講清楚這個定位
- 只有客戶端(exporter/buyer)查 CVI,平台/銀行方視為預設合規,不查
- US$1,000 門檻先寫死

## 影響範圍
- `supabase/migrations/`(新檔案)
- `app/api/travel-rule/route.ts`(新檔案)
- `app/bank/cases/[id]/page.tsx`(顯示卡片 + 撥款後觸發)
- `app/importer/payables/page.tsx`(還款後觸發)

## 決策依據
Kenneth 確認做「合規紀錄產生器」而非真的接 VASP 網路,門檻用 US$1,000(FATF 建議值之一,比較嚴格,案件金額很容易觸發,demo 展示機會較高)。
