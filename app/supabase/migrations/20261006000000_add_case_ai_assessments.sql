-- ============================================================================
-- AI 案件評估(AI Case Assessment)的歷史紀錄表。由使用者手動按
-- Generate / Regenerate 產生,每次新增一筆,不覆蓋、不刪除舊紀錄。
-- AI 呼叫失敗時不寫入(失敗不能被當成一筆真的評估),見
-- app/api/ai/case/route.ts。
-- 見 docs/changes/20261006_AI案件評估改手動並保留歷史.md
-- ============================================================================

create table public.case_ai_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  evaluation text not null,
  ai_provider text not null, -- 'anthropic' | 'openrouter:<model>'
  created_by text, -- 觸發者 email(來自登入 session)
  created_at timestamptz not null default now()
);

create index case_ai_assessments_case_id_created_at_idx
  on public.case_ai_assessments (case_id, created_at desc);

-- 讀取比照 case_news_scans:銀行/研究員/admin 可讀,
-- 寫入只走 service role(API route 用 admin client),不開放 client insert/update。

alter table public.case_ai_assessments enable row level security;

create policy case_ai_assessments_select on public.case_ai_assessments
  for select
  using (public.current_user_role() in ('bank', 'researcher', 'admin'));
