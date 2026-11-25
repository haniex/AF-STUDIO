-- =====================================================================
-- AF STUDIO 2.0 — Row Level Security & privileges
-- Principle: deny by default. Every table has RLS enabled.
-- Clients see only their own rows; admins are checked via is_admin()
-- on the server (never trust role/isAdmin coming from the browser).
-- =====================================================================

-- Lock down function execution: internal helpers are NOT callable by clients.
revoke execute on function public.notify_user(uuid, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.ai_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, int) to service_role;

-- Callable RPCs (each one re-checks permissions internally)
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

-- Anonymous visitors get NOTHING from the database.
revoke all on all tables in schema public from anon;

-- Enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_roles','services','portfolio_items','reviews','before_after','lab_models',
    'pricing_categories','pricing_factors','kb_articles','ai_settings','projects','project_status_history',
    'project_drafts','files','favorites','threads','messages','notifications','ai_conversations',
    'ai_messages','ai_usage','moodboards','review_rounds','review_comments','admin_audit'] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Idempotency: drop existing policies on the AF tables before (re)creating them
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in (
    'profiles','user_roles','services','portfolio_items','reviews','before_after','lab_models',
    'pricing_categories','pricing_factors','kb_articles','ai_settings','projects','project_status_history',
    'project_drafts','files','favorites','threads','messages','notifications','ai_conversations',
    'ai_messages','ai_usage','moodboards','review_rounds','review_comments','admin_audit') loop
    execute format('drop policy if exists %I on %I.%I;', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Column-level privileges: clients may only edit these columns.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, lang, theme, notify_email, notify_inapp, onboarded) on public.profiles to authenticated;
-- No insert/delete for clients (trigger creates; Edge Function deletes the auth user → cascade)

-- ---------------------------------------------------------------------
-- USER ROLES — clients can only see their own role row. No writes at all.
-- ---------------------------------------------------------------------
create policy roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.user_roles from authenticated;

-- ---------------------------------------------------------------------
-- CONTENT TABLES: read for signed-in users (published only), write for admins
-- ---------------------------------------------------------------------
create policy services_read on public.services for select to authenticated using (active or public.is_admin());
create policy services_admin on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy portfolio_read on public.portfolio_items for select to authenticated using (published or public.is_admin());
create policy portfolio_admin on public.portfolio_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy reviews_read on public.reviews for select to authenticated using (published or public.is_admin());
create policy reviews_admin on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy ba_read on public.before_after for select to authenticated using (published or public.is_admin());
create policy ba_admin on public.before_after for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lab_read on public.lab_models for select to authenticated using (published or public.is_admin());
create policy lab_admin on public.lab_models for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pc_read on public.pricing_categories for select to authenticated using (active or public.is_admin());
create policy pc_admin on public.pricing_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pf_read on public.pricing_factors for select to authenticated using (active or public.is_admin());
create policy pf_admin on public.pricing_factors for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Knowledge base and AI settings: admin only (Edge Function reads with service role)
create policy kb_admin on public.kb_articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ai_settings_admin on public.ai_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------
create policy projects_select on public.projects for select to authenticated
  using (client_id = auth.uid() or public.is_admin());
create policy projects_insert on public.projects for insert to authenticated
  with check (client_id = auth.uid() or public.is_admin());
create policy projects_admin_update on public.projects for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy projects_admin_delete on public.projects for delete to authenticated
  using (public.is_admin());

create policy psh_select on public.project_status_history for select to authenticated
  using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid()));
revoke insert, update, delete on public.project_status_history from authenticated;

create policy drafts_own on public.project_drafts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- FILES (metadata). Finals/renders are admin-only writes → client cannot alter them.
-- ---------------------------------------------------------------------
create policy files_select on public.files for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
create policy files_insert on public.files for insert to authenticated
  with check ((owner_id = auth.uid() and uploaded_by = auth.uid() and kind not in ('render','final')) or public.is_admin());
create policy files_delete on public.files for delete to authenticated
  using ((uploaded_by = auth.uid() and kind not in ('render','final')) or public.is_admin());
create policy files_admin_update on public.files for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------
create policy fav_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- THREADS & MESSAGES
-- ---------------------------------------------------------------------
create policy threads_select on public.threads for select to authenticated
  using (client_id = auth.uid() or public.is_admin());
create policy threads_insert on public.threads for insert to authenticated
  with check (client_id = auth.uid() or public.is_admin());
create policy threads_admin_update on public.threads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy messages_select on public.messages for select to authenticated
  using (public.is_admin() or exists (select 1 from public.threads t where t.id = thread_id and t.client_id = auth.uid()));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and (
      public.is_admin() or exists (select 1 from public.threads t where t.id = thread_id and t.client_id = auth.uid())
    )
  );
revoke update, delete on public.messages from authenticated;

-- ---------------------------------------------------------------------
-- NOTIFICATIONS — read own; mark read via RPC only
-- ---------------------------------------------------------------------
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.notifications from authenticated;

-- ---------------------------------------------------------------------
-- AI — history readable/deletable by owner; writes only via Edge Function (service role)
-- ---------------------------------------------------------------------
create policy aic_select on public.ai_conversations for select to authenticated using (user_id = auth.uid());
create policy aic_update on public.ai_conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy aic_delete on public.ai_conversations for delete to authenticated using (user_id = auth.uid());
revoke insert on public.ai_conversations from authenticated;
revoke update on public.ai_conversations from authenticated;
grant update (title) on public.ai_conversations to authenticated;

create policy aim_select on public.ai_messages for select to authenticated using (user_id = auth.uid());
revoke insert, delete on public.ai_messages from authenticated;
revoke update on public.ai_messages from authenticated;
grant update (saved) on public.ai_messages to authenticated;
create policy aim_update_saved on public.ai_messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy aiu_select on public.ai_usage for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.ai_usage from authenticated;

-- ---------------------------------------------------------------------
-- MOODBOARDS
-- ---------------------------------------------------------------------
create policy mb_select on public.moodboards for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy mb_insert on public.moodboards for insert to authenticated with check (user_id = auth.uid());
create policy mb_update on public.moodboards for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())));
create policy mb_delete on public.moodboards for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- REVIEW ROUNDS & COMMENTS
-- ---------------------------------------------------------------------
create policy rr_select on public.review_rounds for select to authenticated
  using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid()));
create policy rr_admin on public.review_rounds for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy rc_select on public.review_comments for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.review_rounds r join public.projects p on p.id = r.project_id
    where r.id = round_id and p.client_id = auth.uid()));
create policy rc_insert on public.review_comments for insert to authenticated
  with check (author_id = auth.uid() and (public.is_admin() or exists (
    select 1 from public.review_rounds r join public.projects p on p.id = r.project_id
    where r.id = round_id and p.client_id = auth.uid())));
revoke update on public.review_comments from authenticated;
create policy rc_admin_delete on public.review_comments for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- AUDIT — admins read only
-- ---------------------------------------------------------------------
create policy audit_select on public.admin_audit for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.admin_audit from authenticated;

-- ---------------------------------------------------------------------
-- REALTIME: publish only what the UI listens to (RLS still applies)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.review_comments;
exception when duplicate_object then null; when undefined_object then null; end $$;
