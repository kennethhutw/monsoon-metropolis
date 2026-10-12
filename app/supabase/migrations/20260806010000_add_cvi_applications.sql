-- ============================================================================
-- CVI (Cleanverse A-Pass) issuance requests. Submitting an application does
-- NOT call Cleanverse — it only creates a pending row. Only an admin
-- approving it (app/api/admin/cvi-applications/[id]/route.ts) triggers the
-- real generate_apass + ComplianceRegistry.registerCVI call.
-- See docs/changes/20260806_CVA資格檢查與申請.md
-- ============================================================================

create table public.cvi_applications (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  role user_role not null,
  applicant_email text,
  status text not null default 'pending', -- pending | approved | rejected
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text,
  cv_record_id text,
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cvi_applications_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index cvi_applications_wallet_idx on public.cvi_applications (lower(wallet_address));
create index cvi_applications_status_idx on public.cvi_applications (status);

create trigger cvi_applications_touch_updated_at
  before update on public.cvi_applications
  for each row execute function public.touch_updated_at();

-- Same pattern as case_news_scans / users — every route touching this table
-- uses the service-role admin client, so RLS here only needs to block the
-- anon/authenticated keys, not model per-role access.
alter table public.cvi_applications enable row level security;
