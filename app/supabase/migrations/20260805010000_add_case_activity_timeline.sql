-- ============================================================================
-- Gives every on-chain milestone its own tx_hash + timestamp column, instead
-- of sharing a single `chain_tx_hash` that mint/submit/approve/reject were
-- all overwriting in turn (so only the last action's hash ever survived).
-- `chain_tx_hash` is now treated as strictly the mint tx hash going forward.
-- Together these columns back a full per-case activity timeline, visible
-- regardless of role/page — see docs/changes note in commit history.
-- ============================================================================

alter table public.cases
  add column submitted_tx_hash text,
  add column submitted_at timestamptz,
  add column approved_tx_hash text,
  add column approved_at timestamptz,
  add column rejected_tx_hash text,
  add column rejected_at timestamptz,
  add column disbursed_tx_hash text,
  add column disbursed_at timestamptz,
  add column repaid_tx_hash text,
  add column repaid_at timestamptz;
