-- ============================================================================
-- Monsoon — Initial Schema
-- Mirrors Monsoon_App/types/{case,risk,chain,admin,user}.ts
-- Run in Supabase SQL Editor, or: supabase db push
-- ============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────

create type user_role as enum ('bank', 'exporter', 'importer', 'researcher', 'admin');
create type finance_type as enum ('receivables', 'supply_chain', 'trade');
create type case_stage as enum ('submitted', 'ai_review', 'credit_committee', 'approved', 'rejected');
create type risk_level as enum ('high', 'medium', 'low');
create type dimension_color as enum ('green', 'orange', 'red');
create type tx_type as enum ('disbursement', 'repayment', 'anomaly', 'identity_reg');
create type alert_level as enum ('high', 'medium', 'low');
create type claude_api_status as enum ('ok', 'degraded', 'down');

-- ── profiles ─────────────────────────────────────────────────────────────
-- Mirrors types/user.ts: AppUser. One row per auth.users row.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  organization text not null default '',
  role user_role not null default 'exporter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, organization, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce(new.raw_user_meta_data ->> 'organization', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'exporter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Helper used throughout RLS policies below.
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── cases ────────────────────────────────────────────────────────────────
-- Mirrors types/case.ts: FinanceCase

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique, -- human-facing code shown in the UI, e.g. "TBC-2024-089"
  company_name text not null,
  finance_type finance_type not null,
  amount numeric(18, 2) not null check (amount > 0),
  stage case_stage not null default 'submitted',
  risk_level risk_level not null default 'medium',
  risk_score numeric(5, 2) not null default 0 check (risk_score >= 0 and risk_score <= 100),
  buyer_concentration numeric(5, 2) not null default 0 check (buyer_concentration >= 0 and buyer_concentration <= 100),
  invoice_hash text,
  chain_tx_hash text,
  exporter_id uuid references public.profiles (id),
  buyer_id uuid references public.profiles (id),
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_stage_idx on public.cases (stage);
create index cases_risk_level_idx on public.cases (risk_level);
create index cases_exporter_id_idx on public.cases (exporter_id);
create index cases_buyer_id_idx on public.cases (buyer_id);
create index cases_created_at_idx on public.cases (created_at desc);
create unique index cases_invoice_hash_key on public.cases (invoice_hash) where invoice_hash is not null;

create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- ── risk_profiles ────────────────────────────────────────────────────────
-- Mirrors types/risk.ts: RiskProfile (DimensionScore[] stored as jsonb)

create table public.risk_profiles (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases (id) on delete cascade,
  company_id text not null,
  company_name text not null,
  total_score numeric(5, 2) not null check (total_score >= 0 and total_score <= 100),
  risk_level risk_level not null,
  financial jsonb not null default '[]'::jsonb,
  onchain jsonb not null default '[]'::jsonb,
  macro jsonb not null default '[]'::jsonb,
  esg jsonb not null default '[]'::jsonb,
  recommended_amount numeric(18, 2),
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

create index risk_profiles_case_id_idx on public.risk_profiles (case_id);
create index risk_profiles_company_id_idx on public.risk_profiles (company_id);

-- ── chain_records ────────────────────────────────────────────────────────
-- Mirrors types/chain.ts: ChainRecord

create table public.chain_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases (id) on delete set null,
  block_number bigint not null,
  tx_hash text not null,
  is_real_hash boolean not null default false,
  tx_type tx_type not null,
  company_name text not null,
  amount numeric(18, 2),
  trigger_condition text,
  risk_score numeric(5, 2),
  anomaly_reason text,
  timestamp timestamptz not null default now()
);

create index chain_records_case_id_idx on public.chain_records (case_id);
create index chain_records_tx_type_idx on public.chain_records (tx_type);
create index chain_records_timestamp_idx on public.chain_records (timestamp desc);
create unique index chain_records_tx_hash_key on public.chain_records (tx_hash);

-- ── alerts ───────────────────────────────────────────────────────────────
-- Mirrors data/mockAlerts.ts: Alert

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases (id) on delete set null,
  level alert_level not null,
  title text not null,
  description text not null,
  is_mock boolean not null default false,
  timestamp timestamptz not null default now()
);

create index alerts_level_idx on public.alerts (level);
create index alerts_timestamp_idx on public.alerts (timestamp desc);

-- ── thresholds ───────────────────────────────────────────────────────────
-- Mirrors types/admin.ts: GlobalThresholds. Singleton row (id fixed to 1).

create table public.thresholds (
  id smallint primary key default 1 check (id = 1),
  buyer_concentration_limit numeric(5, 2) not null default 40,
  overdue_rate_red_line numeric(5, 2) not null default 5,
  single_borrower_limit numeric(18, 2) not null default 5000000,
  updated_at timestamptz not null default now()
);

insert into public.thresholds (id) values (1);

create trigger thresholds_touch_updated_at
  before update on public.thresholds
  for each row execute function public.touch_updated_at();

-- ── audit_log ────────────────────────────────────────────────────────────
-- Mirrors types/admin.ts: AuditLog. Append-only — no update/delete policy
-- is defined below, so authenticated roles cannot modify or remove rows.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  user_email text not null,
  action text not null,
  resource text not null,
  detail text,
  timestamp timestamptz not null default now()
);

create index audit_log_user_id_idx on public.audit_log (user_id);
create index audit_log_timestamp_idx on public.audit_log (timestamp desc);

-- ── error_log ────────────────────────────────────────────────────────────
-- Backs types/admin.ts: SystemHealth.errors24h with a real count instead
-- of a hardcoded value.

create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  detail jsonb,
  timestamp timestamptz not null default now()
);

create index error_log_timestamp_idx on public.error_log (timestamp desc);

-- ── dashboard_stats view ─────────────────────────────────────────────────
-- Computed on read instead of a stored/duplicated stats table.

create view public.dashboard_stats as
select
  count(*) filter (where stage = 'submitted') as pending_count,
  count(*) filter (where stage in ('ai_review', 'credit_committee')) as in_review_count,
  count(*) filter (where stage = 'approved') as approved_count,
  count(*) filter (where stage = 'rejected') as rejected_count,
  coalesce(sum(amount) filter (
    where stage = 'approved' and updated_at >= date_trunc('month', now())
  ), 0) as approved_amount_this_month,
  count(*) filter (where risk_level = 'high') as high_risk_count,
  count(*) filter (where risk_level = 'medium') as medium_risk_count,
  count(*) filter (where risk_level = 'low') as low_risk_count
from public.cases;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.risk_profiles enable row level security;
alter table public.chain_records enable row level security;
alter table public.alerts enable row level security;
alter table public.thresholds enable row level security;
alter table public.audit_log enable row level security;
alter table public.error_log enable row level security;

-- profiles: everyone can read their own row; bank/researcher/admin can read all;
-- users may update their own name/organization; inserts happen only via the
-- on_auth_user_created trigger (security definer bypasses RLS).

create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or public.current_user_role() in ('bank', 'researcher', 'admin'));

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- cases: bank/researcher/admin see everything; exporters see their own
-- submissions; importers see cases where they are the buyer; exporters can
-- create cases for themselves; only bank/admin can change case stage.

create policy cases_select on public.cases
  for select
  using (
    public.current_user_role() in ('bank', 'researcher', 'admin')
    or exporter_id = auth.uid()
    or buyer_id = auth.uid()
  );

create policy cases_insert_exporter on public.cases
  for insert
  with check (
    public.current_user_role() = 'exporter'
    and exporter_id = auth.uid()
  );

create policy cases_update_bank_admin on public.cases
  for update
  using (public.current_user_role() in ('bank', 'admin'));

-- risk_profiles / chain_records / alerts: read-only for bank/researcher/admin.
-- Writes happen server-side (service role) from AI scoring / chain-indexing
-- jobs, so no insert/update policy is granted to client roles.

create policy risk_profiles_select on public.risk_profiles
  for select
  using (public.current_user_role() in ('bank', 'researcher', 'admin'));

create policy chain_records_select on public.chain_records
  for select
  using (public.current_user_role() in ('bank', 'researcher', 'admin'));

create policy alerts_select on public.alerts
  for select
  using (public.current_user_role() in ('bank', 'researcher', 'admin'));

-- thresholds: bank/admin can read; only admin can update.

create policy thresholds_select on public.thresholds
  for select
  using (public.current_user_role() in ('bank', 'admin'));

create policy thresholds_update_admin on public.thresholds
  for update
  using (public.current_user_role() = 'admin');

-- audit_log: admin-only read; any authenticated user may append a row for
-- their own actions. No update/delete policy exists — the table is
-- append-only by omission, per CLAUDE.md ("稽核日誌 → 不可刪除，只能查看和匯出").

create policy audit_log_select_admin on public.audit_log
  for select
  using (public.current_user_role() = 'admin');

create policy audit_log_insert_self on public.audit_log
  for insert
  with check (user_id = auth.uid());

-- error_log: admin-only read. Writes are service-role only (no client policy).

create policy error_log_select_admin on public.error_log
  for select
  using (public.current_user_role() = 'admin');
