-- ============================================================================
-- Persists buyer confirmation (confirmReceivable) as a queryable record —
-- previously this only lived on-chain (read live via isBuyerConfirmed),
-- with no way to tell from Supabase whether/when a buyer actually confirmed.
-- ============================================================================

alter table public.cases
  add column buyer_confirmed_at timestamptz,
  add column buyer_confirmed_tx_hash text;
