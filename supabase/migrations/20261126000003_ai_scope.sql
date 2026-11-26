-- =====================================================================
-- AF AI 3.1 — conversation context (scope): 'general' | 'af_studio'
-- • existing conversations → 'af_studio' (their historical behaviour is kept)
-- • new conversations → 'general' by default
-- • the owner may switch the scope of an own conversation (explicit action in the UI);
--   RLS policy aic_update (user_id = auth.uid()) already restricts it to own rows.
-- Old migrations are not changed. Safe to run again. IDs and history are untouched.
-- =====================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'ai_conversations' and column_name = 'scope') then
    -- added with default 'af_studio' → every existing row gets it, then the default switches to 'general'
    alter table public.ai_conversations add column scope text not null default 'af_studio';
    alter table public.ai_conversations alter column scope set default 'general';
  end if;
end $$;

alter table public.ai_conversations drop constraint if exists ai_conversations_scope_check;
alter table public.ai_conversations add constraint ai_conversations_scope_check check (scope in ('general', 'af_studio'));

-- only title (already) and scope are writable by the owner; everything else stays server-only
grant update (title, scope) on public.ai_conversations to authenticated;

-- Check (expected: scope_column = true, constraint_ok = true, client_can_switch = true, client_cannot_move = true)
select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ai_conversations' and column_name = 'scope') as scope_column,
  exists (select 1 from pg_constraint where conname = 'ai_conversations_scope_check') as constraint_ok,
  has_column_privilege('authenticated', 'public.ai_conversations', 'scope', 'update') as client_can_switch,
  not has_column_privilege('authenticated', 'public.ai_conversations', 'user_id', 'update') as client_cannot_move,
  (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'ai_conversations' and column_name = 'scope') as new_default;
