-- ============================================================================
-- Adds on-chain correlation fields to cases — needed once exporter/bank/
-- importer actions are signed by real wallets (InvoiceAsset tokenId,
-- FinancingPool caseId, and the wallets involved) instead of being purely
-- Supabase-tracked. See docs/changes/20260803_真實鏈上簽署完整流程.md.
-- ============================================================================

alter table public.cases
  add column invoice_token_id bigint,
  add column financing_case_id bigint,
  add column exporter_wallet text,
  add column buyer_wallet text;

create index cases_invoice_token_id_idx on public.cases (invoice_token_id) where invoice_token_id is not null;
create index cases_financing_case_id_idx on public.cases (financing_case_id) where financing_case_id is not null;
