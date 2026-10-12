# 20260808_TravelRule門檻可調整

## 變更摘要

把 Travel Rule 適用門檻(目前寫死在 `app/api/travel-rule/route.ts` 的 `TRAVEL_RULE_THRESHOLD_USD = 1000`)
移進 Supabase 的 `thresholds` 表,並在既有的 `/admin/thresholds`(Threshold Settings)頁面加一個欄位讓 Admin 可以改。

## 變更內容

- ⚠️ 更正(寫這份文件時查code才發現):`public.thresholds` 表**早就存在**(`20260731000000_init_schema.sql`,單一列 `id=1`,欄位 `buyer_concentration_limit` / `overdue_rate_red_line` / `single_borrower_limit` / `updated_at`,RLS 已設好:bank/admin 可讀、只有 admin 可寫)。問題是 `app/api/admin/thresholds/route.ts` 從來沒接上這張表,GET/PUT 一直是寫死的 `MOCK_THRESHOLDS`,跟資料庫預設值(40 / 5 / 5000000)對不起來,Admin 頁面按 Save 也不會真的持久化。
- 新增 migration(**ALTER TABLE,不是新建表**):`public.thresholds` 加一欄 `travel_rule_threshold_usd numeric(18, 2) not null default 1000`(對應 FATF R.16 US$1,000 門檻),另外加 `updated_by text`(記錄最後修改的 Admin email)。
- `app/api/admin/thresholds/route.ts`:GET/PUT 改接真實 Supabase 查詢/更新這張既有的表。PUT 寫入稽核日誌(對應 CLAUDE.md Admin 規則第 7 條),沿用 `lib/supabase/auditLog.ts` 既有的 `writeAuditLog` helper,`actorEmail` 從前端 `useRole()` 取得(跟 `/admin/cvi-applications` 頁面同樣的作法)。
- `types/admin.ts` 的 `GlobalThresholds` 加上 `travelRuleThresholdUsd: number`。
- `app/admin/thresholds/page.tsx` 加第 4 個欄位「Travel Rule Threshold (USD)」。
- `app/api/travel-rule/route.ts`:拿掉寫死的 `TRAVEL_RULE_THRESHOLD_USD = 1000`,改成每次 POST 時查 `thresholds` 表的 `travel_rule_threshold_usd`。查詢失敗時 fallback 回 1000(不讓 Travel Rule 記錄產生功能因為這張表讀取失敗而整個掛掉)。

## 影響範圍

- 頁面:`/admin/thresholds`
- API:`app/api/admin/thresholds/route.ts`(GET/PUT)、`app/api/travel-rule/route.ts`(POST 內部查詢邏輯,對外介面不變)
- 型別:`types/admin.ts`
- 新 migration:`supabase/migrations/20260808000000_add_travel_rule_threshold.sql`(ALTER,非 CREATE)

## 對應 PRD 章節

- 呼應 `docs/changes/20260807_TravelRule合規紀錄.md` 裡「門檻寫死」的已知限制,這次補上可調整能力。

## 決策依據

- `public.thresholds` 表跟它的 RLS 政策早就存在,`/admin/thresholds` 頁面跟 API 也早就是為了它搭好的骨架,只是 API 從沒真的接上、PUT 也還沒真的持久化。與其為 Travel Rule 另外開一張獨立的 settings 表,不如直接把這個既有骨架接上真實資料,一次把「這個頁面是 mock」跟「Travel Rule 門檻寫死」兩個問題一起解掉,範圍沒有超出「讓這個既有頁面變真的」。
- Admin 修改門檻是敏感操作,依 CLAUDE.md 規則必須寫稽核日誌,所以 PUT 這條路徑會補上 `writeAuditLog` 呼叫。
