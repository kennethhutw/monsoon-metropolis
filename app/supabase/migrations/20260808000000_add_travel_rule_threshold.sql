-- Adds the Travel Rule applicability threshold to the existing singleton
-- `thresholds` row, and tracks who last touched it. See
-- docs/changes/20260808_TravelRule門檻可調整.md

alter table public.thresholds
  add column travel_rule_threshold_usd numeric(18, 2) not null default 1000,
  add column updated_by text;
