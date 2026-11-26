-- =====================================================================
-- AF AI 3.2 — web search (Grounding with Google Search) + sources
-- • ai_settings.web_search — the administrator can switch web search off for everyone
-- • ai_messages.sources   — links the answer was based on (shown under the answer)
-- Old migrations are not changed. Safe to run again.
-- =====================================================================
alter table public.ai_settings add column if not exists web_search boolean not null default true;
alter table public.ai_messages add column if not exists sources jsonb;

-- sources are written only by the server (service_role); clients keep read access via RLS (aim_select)
revoke update on public.ai_messages from authenticated;
grant update (saved) on public.ai_messages to authenticated;

-- Check (expected: every column = true)
select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_settings' and column_name = 'web_search') as web_search_column,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_messages' and column_name = 'sources') as sources_column,
  not has_column_privilege('authenticated', 'public.ai_messages', 'sources', 'update') as client_cannot_edit_sources,
  (select web_search from public.ai_settings where id = 1) is not false as web_search_on;
