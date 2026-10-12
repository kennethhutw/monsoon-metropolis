-- ============================================================================
-- Travel Rule (FATF Recommendation 16) compliance records — generated
-- automatically at disbursement/repayment, not a real VASP-to-VASP transfer
-- network. See docs/changes/20260807_TravelRule合規紀錄.md
-- ============================================================================

create table public.travel_rule_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  event_type text not null, -- 'disbursement' | 'repayment'
  amount numeric(18, 2) not null,
  applicable boolean not null, -- amount >= 1000 (USD threshold)
  customer_role text not null, -- 'exporter' | 'buyer'
  customer_wallet text not null,
  customer_name text,
  customer_cvi_verified boolean not null,
  compliant boolean not null, -- !applicable || customer_cvi_verified
  tx_hash text not null,
  created_at timestamptz not null default now(),
  constraint travel_rule_records_event_type_check check (event_type in ('disbursement', 'repayment')),
  constraint travel_rule_records_customer_role_check check (customer_role in ('exporter', 'buyer'))
);

create index travel_rule_records_case_id_idx on public.travel_rule_records (case_id);

alter table public.travel_rule_records enable row level security;
