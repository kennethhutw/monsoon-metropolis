-- ============================================================================
-- Standalone table backing the app's mock-login system (email/password
-- compared server-side, not real Supabase Auth). Deliberately separate from
-- `public.profiles`, whose `id` is a hard FK to `auth.users` and is reserved
-- for a future real-Supabase-Auth migration that hasn't happened yet.
-- See docs/changes/20260806_使用者管理真實化.md
-- ============================================================================

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password text not null, -- plaintext — mirrors the security level data/mockUsers.ts already had
  role user_role not null,
  name text not null,
  organization text not null,
  wallet_address text, -- admin-set; NFT count is derived from cases.exporter_wallet matching this
  is_seed boolean not null default false, -- true = one of the 5 built-in demo accounts; password locked from the admin UI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_key on public.users (lower(email));
create index users_wallet_address_idx on public.users (lower(wallet_address)) where wallet_address is not null;

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- Seed the 5 existing demo accounts (data/mockUsers.ts) so login keeps
-- working immediately after this migration runs — same emails/passwords/
-- roles/names/organizations, now source-of-truth in the DB instead of a
-- hardcoded array shipped to the client.
insert into public.users (email, password, role, name, organization, is_seed) values
  ('bank@monsoon.demo',       'demo1234',  'bank',       'David Lin',              'Meridian Commercial Bank — Trade Finance Division', true),
  ('exporter@monsoon.demo',   'demo1234',  'exporter',   'Sarah Tan',              'Formosa Precision Electronics Co., Ltd',             true),
  ('importer@monsoon.demo',   'demo1234',  'importer',   'James Whitfield',        'Atlas Industrial Buyers Inc.',                       true),
  ('researcher@monsoon.demo', 'demo1234',  'researcher', 'Aisha Rahman',           'Asia Trade Finance Research Institute',              true),
  ('admin@monsoon.demo',      'admin5678', 'admin',      'System Administrator',   'Monsoon Platform',                                   true);

-- This table backs a mock/demo auth system, not real user identities behind
-- Supabase Auth — every route touching it already uses the service-role
-- admin client (see lib/supabase/admin.ts), so RLS here only needs to block
-- the anon/authenticated keys, not model per-role access.
alter table public.users enable row level security;
