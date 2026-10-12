-- ============================================================================
-- buyer_name / invoice_number were already being collected by the Exporter
-- Apply form and sent to POST /api/mock/cases, but the route only used them
-- to compute invoice_hash — it never actually wrote them to a column, so the
-- data was silently dropped. This migration adds real columns for them, plus
-- a few more fields a bank reviewer needs (due date, industry, country) that
-- the Case Information card had no data to show.
-- See docs/changes/20260805_新增貿易融資案件欄位.md
-- ============================================================================

alter table public.cases
  add column buyer_name text,
  add column invoice_number text,
  add column due_date date,
  add column currency text not null default 'USD',
  add column industry text,
  add column buyer_country text,
  add column exporter_country text;
