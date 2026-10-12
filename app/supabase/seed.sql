-- ============================================================================
-- Monsoon — Demo Seed Data
-- Mirrors Monsoon_App/data/mock{Cases,Risk,Chain,Alerts}.ts so the on-chain
-- demo narrative (Formosa Precision Electronics duplicate-financing story)
-- still works once a page switches from mock data to a real Supabase query.
--
-- Run AFTER 20260731000000_init_schema.sql.
--
-- IMPORTANT — profiles depend on auth.users, which this script cannot
-- create directly (Supabase Auth owns that table). Before running the
-- "profiles" section below:
--   1. Go to Supabase Dashboard → Authentication → Users → Add user
--   2. Create the 5 demo accounts from data/mockUsers.ts:
--        bank@monsoon.demo / exporter@monsoon.demo / importer@monsoon.demo
--        researcher@monsoon.demo / admin@monsoon.demo
--      (pick any password — this table no longer needs the plaintext
--      MOCK_USERS.password once Supabase Auth is wired up)
--   3. On each user, set "User Metadata" (raw_user_meta_data) to e.g.:
--        { "name": "Sarah Tan", "organization": "Formosa Precision Electronics Co., Ltd", "role": "exporter" }
--      The on_auth_user_created trigger reads this to populate profiles
--      automatically. If you skip step 3, the UPSERT below fixes it up
--      afterwards by matching on email.
-- ============================================================================

-- ── profiles (fills in / corrects role, name, organization by email) ──────

update public.profiles set role = 'bank',       name = 'David Lin',            organization = 'Meridian Commercial Bank — Trade Finance Division'
  where email = 'bank@monsoon.demo';
update public.profiles set role = 'exporter',   name = 'Sarah Tan',            organization = 'Formosa Precision Electronics Co., Ltd'
  where email = 'exporter@monsoon.demo';
update public.profiles set role = 'importer',   name = 'James Whitfield',      organization = 'Atlas Industrial Buyers Inc.'
  where email = 'importer@monsoon.demo';
update public.profiles set role = 'researcher', name = 'Aisha Rahman',         organization = 'Asia Trade Finance Research Institute'
  where email = 'researcher@monsoon.demo';
update public.profiles set role = 'admin',      name = 'System Administrator', organization = 'Monsoon Platform'
  where email = 'admin@monsoon.demo';

-- ── cases ────────────────────────────────────────────────────────────────
-- exporter_id is wired for the Formosa case only, since that's the only
-- mock company that maps to one of the 5 demo accounts (Sarah Tan).

insert into public.cases (case_number, company_name, finance_type, amount, stage, risk_level, risk_score, buyer_concentration, chain_tx_hash, exporter_id, is_mock, created_at, updated_at)
values
  ('TBC-2024-089', 'Formosa Precision Electronics',   'receivables',   45000000, 'ai_review',        'high',   54, 78, null,                   (select id from public.profiles where email = 'exporter@monsoon.demo'), true, now() - interval '2 days',  now() - interval '1 day'),
  ('OSL-2024-112', 'Pacific Ocean Shipping Co.',       'supply_chain',  28750000, 'credit_committee', 'medium', 67, 55, null,                   null, true, now() - interval '4 days',  now() - interval '2 days'),
  ('CCS-2024-203', 'Steelcraft Supplier #027',         'receivables',   12500000, 'approved',         'low',    88, 28, '0x3f8a2c4e91b4MOCK001', null, true, now() - interval '10 days', now() - interval '7 days'),
  ('UEL-2024-098', 'Union Allied Electronics',         'trade',         32000000, 'ai_review',        'medium', 63, 48, null,                   null, true, now() - interval '3 days',  now() - interval '12 hours'),
  ('TKP-2024-177', 'Formosa Machinery Industries',     'supply_chain',   9500000, 'approved',         'low',    79, 35, null,                   null, true, now() - interval '15 days', now() - interval '9 days'),
  ('STA-2024-055', 'Skyline Aerospace Components',     'receivables',   68000000, 'submitted',        'low',    82, 41, null,                   null, true, now() - interval '1 hour',  now() - interval '1 hour');

-- ── risk_profiles ────────────────────────────────────────────────────────

insert into public.risk_profiles (case_id, company_id, company_name, total_score, risk_level, financial, onchain, macro, esg, recommended_amount, is_mock)
values
  (
    null, 'company-tsmc-a', 'Meridian Semiconductor Components', 82, 'low',
    '[{"label":"Current Ratio","score":82,"color":"green"},{"label":"Debt Ratio (lower = better)","score":35,"color":"orange"},{"label":"EBITDA Margin","score":75,"color":"green"},{"label":"Receivables Turnover","score":68,"color":"green"}]',
    '[{"label":"Transaction Continuity","score":95,"color":"green"},{"label":"Buyer Concentration (lower = better)","score":28,"color":"green"},{"label":"On-Time Delivery Confirmation Rate","score":91,"color":"green"},{"label":"Smart Contract Compliance Rate","score":100,"color":"green"}]',
    '[{"label":"Industry Sentiment Index","score":70,"color":"green"},{"label":"Supply Chain Disruption Risk","score":22,"color":"green"},{"label":"Geopolitical Exposure","score":40,"color":"orange"}]',
    '[{"label":"Carbon Footprint Disclosure","score":85,"color":"green"},{"label":"Supplier Labor Compliance","score":78,"color":"green"},{"label":"Corporate Governance Score","score":80,"color":"green"}]',
    80000000, true
  ),
  (
    (select id from public.cases where case_number = 'TBC-2024-089'), 'company-precision', 'Formosa Precision Electronics', 54, 'high',
    '[{"label":"Current Ratio","score":55,"color":"orange"},{"label":"Debt Ratio (lower = better)","score":72,"color":"red"},{"label":"EBITDA Margin","score":48,"color":"red"},{"label":"Receivables Turnover","score":40,"color":"red"}]',
    '[{"label":"Transaction Continuity","score":60,"color":"orange"},{"label":"Buyer Concentration (lower = better)","score":78,"color":"red"},{"label":"On-Time Delivery Confirmation Rate","score":55,"color":"orange"},{"label":"Smart Contract Compliance Rate","score":80,"color":"green"}]',
    '[{"label":"Industry Sentiment Index","score":52,"color":"orange"},{"label":"Supply Chain Disruption Risk","score":60,"color":"red"},{"label":"Geopolitical Exposure","score":55,"color":"orange"}]',
    '[{"label":"Carbon Footprint Disclosure","score":40,"color":"red"},{"label":"Supplier Labor Compliance","score":50,"color":"orange"},{"label":"Corporate Governance Score","score":45,"color":"red"}]',
    null, true
  );

-- ── chain_records ────────────────────────────────────────────────────────

insert into public.chain_records (case_id, block_number, tx_hash, is_real_hash, tx_type, company_name, amount, trigger_condition, risk_score, anomaly_reason, timestamp)
values
  ((select id from public.cases where case_number = 'CCS-2024-203'), 4821037, '0x3f8a2c4e91b4MOCKMOCKMOCK001', false, 'disbursement', 'Steelcraft Supplier #027',       12500000, 'Delivery Confirmed ✓',        88, null,                                    now() - interval '1 minute'),
  ((select id from public.cases where case_number = 'TBC-2024-089'), 4821031, '0xd42e9f8107c83MOCKMOCKMOCK002', false, 'anomaly',      'Formosa Precision Electronics',  45000000, null,                                54, 'Duplicate buyer financing detected',   now() - interval '8 minutes'),
  ((select id from public.cases where case_number = 'OSL-2024-112'), 4821028, '0xa19f5b2c38e21MOCKMOCKMOCK003', false, 'repayment',    'Pacific Ocean Shipping Co.',     28750000, 'Automatic repayment at maturity',  67, null,                                    now() - interval '14 minutes');

-- ── alerts ───────────────────────────────────────────────────────────────

insert into public.alerts (case_id, level, title, description, is_mock, timestamp)
values
  ((select id from public.cases where case_number = 'TBC-2024-089'), 'high',   'High Risk: Duplicate Financing Concern',
   'Formosa Precision Electronics appears to have applied for financing on the same batch of receivables with two different banks — recommend immediate freeze and investigation.',
   true, now() - interval '1 hour'),
  ((select id from public.cases where case_number = 'OSL-2024-112'), 'high',   'High Risk: Concentration Limit Exceeded',
   'Pacific Ocean Shipping Co.''s top three buyers account for 83% of receivables combined, exceeding the internal 70% policy limit.',
   true, now() - interval '2 hours'),
  (null, 'medium', 'Medium Risk: Exchange Rate Volatility Alert',
   'USD/TWD moved 1.52% this week — recommend activating dynamic margin mechanisms for 8 USD-denominated cases.',
   true, now() - interval '3 hours');
