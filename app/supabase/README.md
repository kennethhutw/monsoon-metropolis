# Monsoon — Supabase Schema

對應 `types/case.ts` / `types/risk.ts` / `types/chain.ts` / `types/admin.ts` / `types/user.ts`,
以及現有 `lib/supabase/{client,server,middleware}.ts` 的 boilerplate。目前 App 仍是 `NEXT_PUBLIC_CONTRACT_MODE`/mock 資料驅動,這份 schema 是**為之後接上 Supabase 預先準備**,現在不會影響現有 mock 模式的運作。

## 檔案

- `migrations/20260731000000_init_schema.sql` — 8 張表 + 1 個 view + RLS policies
- `seed.sql` — 對應 `data/mock{Cases,Risk,Chain,Alerts}.ts` 的示範資料(含 Formosa Precision Electronics 重複融資的 demo 主線故事)

## 資料表一覽

| 表 | 對應 type | 備註 |
|---|---|---|
| `profiles` | `AppUser` | 綁定 `auth.users`,新使用者註冊時用 trigger 自動建立 |
| `cases` | `FinanceCase` | `case_number` 存 `TBC-2024-089` 這種人類可讀編號,`id` 是內部 UUID |
| `risk_profiles` | `RiskProfile` | 四個構面(`financial`/`onchain`/`macro`/`esg`)存成 `jsonb` |
| `chain_records` | `ChainRecord` | |
| `alerts` | `Alert`(`data/mockAlerts.ts`) | |
| `thresholds` | `GlobalThresholds` | 單例表,固定一列(`id=1`) |
| `audit_log` | `AuditLog` | **只能新增、不能改/刪**(對應 CLAUDE.md 規則 7:稽核日誌不可刪除) |
| `error_log` | 支援 `SystemHealth.errors24h` | 讓錯誤數是真的算出來,不是寫死 |
| `dashboard_stats`(view) | 給 `/bank/dashboard` 統計卡用 | 從 `cases` 即時算,不用額外維護一張表 |

## RLS 權限

依照 `CLAUDE.md` 的角色權限表實作:Bank/Admin 可讀寫案件與審核,Exporter 只能看/建自己的案件(`exporter_id = auth.uid()`),Importer 只能看自己是買方的案件(`buyer_id`),Researcher 全表唯讀,Admin 全開。

## 執行步驟(請自行操作,我不會幫你連線執行)

1. **建立 Migration**
   打開 Supabase Dashboard → SQL Editor,貼上 `migrations/20260731000000_init_schema.sql` 執行。
   或用 CLI:
   ```bash
   supabase db push
   ```

2. **建立 5 個 demo 帳號**(Auth → Users → Add user),對應 `data/mockUsers.ts` 的 email:
   `bank@monsoon.demo` / `exporter@monsoon.demo` / `importer@monsoon.demo` / `researcher@monsoon.demo` / `admin@monsoon.demo`
   建立時可在 User Metadata 填入 `{"name":"...","organization":"...","role":"..."}`,trigger 會自動寫進 `profiles`。

3. **灌入 demo 資料**
   Auth 帳號建立後,執行 `seed.sql`(SQL Editor 或 `supabase db execute -f supabase/seed.sql`)。
   `seed.sql` 內的 `UPDATE ... where email = ...` 會補齊 / 校正 5 個帳號的 role、name、organization。

4. **App 端接線**(等你想切換到 real 模式時再做)
   把 `.env.local` 的 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` 填好,再依 `data/*.ts` 各檔案上的 TODO 註解,把讀取換成 `supabase.from('cases').select()` 之類的呼叫。這部分我還沒動,因為現在 Hackathon 展示仍走 mock 模式。

## 目前狀態

Schema 與 seed 只是「先準備好」,**尚未接進任何頁面**。App 現在仍完全依賴 `data/mock*.ts`,兩者互不影響,你可以先執行測試 schema 沒有問題,之後再排時間做真正的資料串接。
