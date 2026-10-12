-- ============================================================================
-- 負面新聞掃描(adverse media)的歷史紀錄表。每次掃描新增一筆,不覆蓋、不刪除
-- 舊紀錄 —— 只存 AI 摘要 + 來源連結,不存文章全文。下次掃描以最新一筆的
-- searched_at 當作增量搜尋的起點(見 app/api/ai/adverse-media/route.ts)。
-- 見 docs/changes/20260805_負面新聞掃描功能.md
-- ============================================================================

create table public.case_news_scans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  searched_at timestamptz not null default now(),
  since_date timestamptz, -- 這次搜尋實際用的 startPublishedDate；第一次掃描為 null(代表查全部)
  summary text not null,
  sources jsonb not null default '[]'::jsonb, -- { title, url, publishedDate }[]
  ai_provider text not null, -- 'anthropic' | 'openrouter:<model>'
  created_at timestamptz not null default now()
);

create index case_news_scans_case_id_searched_at_idx
  on public.case_news_scans (case_id, searched_at desc);

-- 讀取比照 risk_profiles/chain_records/alerts:銀行/研究員/admin 可讀,
-- 寫入只走 service role(API route 用 admin client),不開放 client insert/update。

alter table public.case_news_scans enable row level security;

create policy case_news_scans_select on public.case_news_scans
  for select
  using (public.current_user_role() in ('bank', 'researcher', 'admin'));
