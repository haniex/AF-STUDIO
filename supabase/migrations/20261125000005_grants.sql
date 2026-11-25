-- =====================================================================
-- AF STUDIO 2.0 — explicit table privileges (fix for 42501 "permission denied").
-- New Supabase projects no longer grant API roles access to new tables automatically.
-- Security is unchanged: RLS policies (0002) still decide WHICH rows each user sees;
-- the restrictive revokes from 0002 are re-applied at the end of this file.
-- Safe to run several times.
-- =====================================================================

grant usage on schema public to authenticated, service_role;

-- Server side (Edge Functions with the secret key): full access, bypasses RLS by design
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Signed-in users: table access governed by RLS policies
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Anonymous visitors: nothing
revoke all on all tables in schema public from anon;

-- Future tables get the same treatment
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ---------------------------------------------------------------------
-- Re-apply the restrictions from 0002 (read-only tables, column-level grants, RPC access)
-- ---------------------------------------------------------------------
revoke execute on function public.notify_user(uuid, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.ai_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, int) to service_role;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_client_request() to authenticated;
grant execute on function public.attach_files_to_project(uuid, uuid[]) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.decide_review_round(uuid, text, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_activity(int) to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_role(uuid, boolean) to authenticated;
grant execute on function public.admin_set_project_status(uuid, public.project_status, text) to authenticated;
revoke all on all tables in schema public from anon;
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, lang, theme, notify_email, notify_inapp, onboarded) on public.profiles to authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
revoke insert, update, delete on public.project_status_history from authenticated;
revoke update, delete on public.messages from authenticated;
revoke insert, update on public.notifications from authenticated;
revoke insert on public.ai_conversations from authenticated;
revoke update on public.ai_conversations from authenticated;
grant update (title) on public.ai_conversations to authenticated;
revoke insert, delete on public.ai_messages from authenticated;
revoke update on public.ai_messages from authenticated;
grant update (saved) on public.ai_messages to authenticated;
revoke insert, update, delete on public.ai_usage from authenticated;
revoke update on public.review_comments from authenticated;
revoke insert, update, delete on public.admin_audit from authenticated;

-- ---------------------------------------------------------------------
-- Check (expected: every column = true)
-- ---------------------------------------------------------------------
select
  has_table_privilege('service_role',  'public.ai_settings', 'select') as service_ai_settings,
  has_table_privilege('service_role',  'public.ai_messages', 'insert') as service_ai_messages,
  has_table_privilege('authenticated', 'public.projects',    'select') as client_projects,
  has_table_privilege('authenticated', 'public.favorites',   'insert') as client_favorites,
  not has_table_privilege('authenticated', 'public.user_roles', 'insert') as client_cannot_grant_roles,
  not has_table_privilege('anon', 'public.projects', 'select') as anon_blocked;
