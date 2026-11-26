-- =====================================================================
-- AF STUDIO 3.0 — account preferences (Settings Center)
-- Новая таблица public.user_preferences: одна строка на пользователя.
-- Хранит ТОЛЬКО новые аккаунтные параметры. Поля profiles (lang, theme,
-- notify_email, notify_inapp, onboarded) и локальные af.fx / af.q3d / af.glow
-- сюда НЕ переносятся.
--
-- Модель хранения: в колонках лежат только изменённые пользователем значения,
-- значения по умолчанию задаёт public.af_pref_defaults() и подмешиваются при чтении.
-- Запись — только через RPC save_my_preferences / reset_my_preferences
-- (allowlist ключей + проверка типов и значений на сервере).
--
-- Безопасно запускать повторно. Старые миграции не изменяются.
-- =====================================================================

create table if not exists public.user_preferences (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  notifications  jsonb not null default '{}'::jsonb check (jsonb_typeof(notifications) = 'object'),
  ai             jsonb not null default '{}'::jsonb check (jsonb_typeof(ai) = 'object'),
  appearance     jsonb not null default '{}'::jsonb check (jsonb_typeof(appearance) = 'object'),
  workspace      jsonb not null default '{}'::jsonb check (jsonb_typeof(workspace) = 'object'),
  experimental   jsonb not null default '{}'::jsonb check (jsonb_typeof(experimental) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Allowlist: category → key → rule.
--   array      — список разрешённых значений
--   "bool"     — true / false
--   "channels" — {"in_app": bool, "email": bool} (частичное обновление)
--   "time"     — "HH:MM"
--   "tz"       — IANA timezone ("Europe/Moscow") или ""
-- Синхронизировано с js/core/preferences.js (SPEC). Меняется только новой миграцией.
-- ---------------------------------------------------------------------
create or replace function public.af_pref_spec()
returns jsonb language sql immutable set search_path = public as $$
  select '{
    "notifications": {
      "project_updates": "channels", "messages": "channels", "approvals": "channels",
      "files": "channels", "ai": "channels", "platform_news": "channels",
      "sound": "bool", "browser": "bool",
      "quiet_enabled": "bool", "quiet_from": "time", "quiet_to": "time", "quiet_tz": "tz"
    },
    "ai": {
      "response_style": ["concise", "balanced", "detailed"],
      "response_language": ["auto", "ru", "en"],
      "default_mode": ["chat", "brief", "estimate"],
      "save_history": "bool", "use_project_context": "bool",
      "moodboard_images": "bool", "extended_stats": "bool"
    },
    "appearance": {
      "text_scale": [90, 100, 110, 120],
      "density": ["comfortable", "compact"],
      "contrast": ["standard", "high"],
      "card_style": ["default", "minimal"],
      "sidebar": ["expanded", "compact"],
      "accent": ["gold", "champagne", "bronze", "platinum"],
      "tooltips": "bool", "hover_effects": "bool"
    },
    "workspace": {
      "start_page": ["overview", "projects", "ai", "portfolio"],
      "projects_view": ["grid", "list"],
      "projects_sort": ["updated_desc", "created_desc", "name_asc", "status"],
      "files_view": ["list", "grid"],
      "files_sort": ["created_desc", "created_asc", "name_asc", "size_desc"],
      "project_default_tab": ["overview", "files", "review", "messages", "history"],
      "page_size": [12, 24, 48],
      "remember_filters": "bool",
      "ov_stats": "bool", "ov_quick": "bool", "ov_activity": "bool",
      "ov_favorites": "bool", "ov_ai": "bool", "ov_about": "bool",
      "kbd_hints": "bool"
    },
    "experimental": {
      "reveal": "bool", "ripple": "bool", "scroll_progress": "bool",
      "ui_sounds": "bool", "hero_hint": "bool"
    }
  }'::jsonb
$$;

create or replace function public.af_pref_defaults()
returns jsonb language sql immutable set search_path = public as $$
  select '{
    "notifications": {
      "project_updates": {"in_app": true, "email": true},
      "messages": {"in_app": true, "email": true},
      "approvals": {"in_app": true, "email": true},
      "files": {"in_app": true, "email": true},
      "ai": {"in_app": false, "email": false},
      "platform_news": {"in_app": false, "email": false},
      "sound": false, "browser": false,
      "quiet_enabled": false, "quiet_from": "22:00", "quiet_to": "08:00", "quiet_tz": ""
    },
    "ai": {
      "response_style": "balanced", "response_language": "auto", "default_mode": "chat",
      "save_history": true, "use_project_context": false, "moodboard_images": true, "extended_stats": true
    },
    "appearance": {
      "text_scale": 100, "density": "comfortable", "contrast": "standard", "card_style": "default",
      "sidebar": "expanded", "accent": "gold", "tooltips": true, "hover_effects": true
    },
    "workspace": {
      "start_page": "overview", "projects_view": "grid", "projects_sort": "updated_desc",
      "files_view": "list", "files_sort": "created_desc", "project_default_tab": "overview",
      "page_size": 24, "remember_filters": false,
      "ov_stats": true, "ov_quick": true, "ov_activity": true, "ov_favorites": true, "ov_ai": true, "ov_about": true,
      "kbd_hints": true
    },
    "experimental": {
      "reveal": true, "ripple": true, "scroll_progress": true, "ui_sounds": false, "hero_hint": true
    }
  }'::jsonb
$$;

-- Stored overrides merged over defaults (channels are merged one level deep).
create or replace function public.af_pref_merge(p_category text, p_stored jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_out jsonb := coalesce(public.af_pref_defaults() -> p_category, '{}'::jsonb);
  v_spec jsonb := coalesce(public.af_pref_spec() -> p_category, '{}'::jsonb);
  k text; v jsonb;
begin
  for k, v in select key, value from jsonb_each(coalesce(p_stored, '{}'::jsonb)) loop
    if not (v_spec ? k) then continue; end if;                       -- unknown keys are ignored on read
    if v_spec -> k = '"channels"'::jsonb and jsonb_typeof(v) = 'object' then
      v_out := jsonb_set(v_out, array[k], coalesce(v_out -> k, '{}'::jsonb) || v, true);
    else
      v_out := jsonb_set(v_out, array[k], v, true);
    end if;
  end loop;
  return v_out;
end $$;

create or replace function public.af_preferences_json(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.user_preferences;
begin
  select * into r from public.user_preferences where user_id = p_user;
  return jsonb_build_object(
    'notifications', public.af_pref_merge('notifications', r.notifications),
    'ai',            public.af_pref_merge('ai', r.ai),
    'appearance',    public.af_pref_merge('appearance', r.appearance),
    'workspace',     public.af_pref_merge('workspace', r.workspace),
    'experimental',  public.af_pref_merge('experimental', r.experimental),
    'updated_at',    r.updated_at
  );
end $$;

-- ---------------------------------------------------------------------
-- Row creation: trigger for new profiles + safe backfill (never overwrites)
-- ---------------------------------------------------------------------
create or replace function public.af_create_user_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_profile_preferences on public.profiles;
create trigger trg_profile_preferences after insert on public.profiles
  for each row execute function public.af_create_user_preferences();

insert into public.user_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- RPC: read own preferences (creates the row if it is missing)
-- ---------------------------------------------------------------------
create or replace function public.get_my_preferences()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.user_preferences (user_id)
  select v_uid where exists (select 1 from public.profiles where id = v_uid)
  on conflict (user_id) do nothing;
  return public.af_preferences_json(v_uid);
end $$;

-- ---------------------------------------------------------------------
-- RPC: partial update of ONE category, strictly validated.
-- p_expected — updated_at, который видел клиент. Если запись с тех пор изменилась
-- (другое устройство / вкладка) → ошибка pref_conflict, ничего не перезаписывается.
-- ---------------------------------------------------------------------
create or replace function public.save_my_preferences(p_category text, p_patch jsonb, p_expected timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_spec jsonb;
  v_rule jsonb;
  v_row  public.user_preferences;
  v_cur  jsonb;
  k text; v jsonb; ck text; cv jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_spec := public.af_pref_spec() -> p_category;
  if p_category is null or v_spec is null then
    raise exception 'unknown_category' using errcode = '22023', detail = coalesce(p_category, 'null');
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_patch' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_patch)) = 0 then
    raise exception 'empty_patch' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_patch)) > 40 or length(p_patch::text) > 8000 then
    raise exception 'patch_too_large' using errcode = '22023';
  end if;

  insert into public.user_preferences (user_id)
  select v_uid where exists (select 1 from public.profiles where id = v_uid)
  on conflict (user_id) do nothing;
  select * into v_row from public.user_preferences where user_id = v_uid for update;
  if not found then raise exception 'profile_missing' using errcode = '22023'; end if;

  if p_expected is not null and v_row.updated_at > p_expected then
    raise exception 'pref_conflict' using detail = v_row.updated_at::text;
  end if;

  v_cur := public.af_pref_merge(p_category, to_jsonb(v_row) -> p_category);

  for k, v in select key, value from jsonb_each(p_patch) loop
    v_rule := v_spec -> k;
    if v_rule is null then
      raise exception 'unknown_key' using errcode = '22023', detail = k;
    elsif jsonb_typeof(v_rule) = 'array' then
      if jsonb_typeof(v) not in ('string', 'number') or not (v_rule @> jsonb_build_array(v)) then
        raise exception 'invalid_value' using errcode = '22023', detail = k;
      end if;
    elsif v_rule = '"bool"'::jsonb then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'invalid_value' using errcode = '22023', detail = k; end if;
    elsif v_rule = '"time"'::jsonb then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'invalid_value' using errcode = '22023', detail = k;
      end if;
    elsif v_rule = '"tz"'::jsonb then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 64
         or (v #>> '{}') !~ '^([A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2})?$' then
        raise exception 'invalid_value' using errcode = '22023', detail = k;
      end if;
    elsif v_rule = '"channels"'::jsonb then
      if jsonb_typeof(v) <> 'object' or (select count(*) from jsonb_object_keys(v)) = 0 then
        raise exception 'invalid_value' using errcode = '22023', detail = k;
      end if;
      for ck, cv in select key, value from jsonb_each(v) loop
        if ck not in ('in_app', 'email') or jsonb_typeof(cv) <> 'boolean' then
          raise exception 'invalid_value' using errcode = '22023', detail = k || '.' || ck;
        end if;
      end loop;
      v := coalesce(v_cur -> k, '{}'::jsonb) || v;
    else
      raise exception 'invalid_spec' using errcode = '22023', detail = k;
    end if;
    v_cur := jsonb_set(v_cur, array[k], v, true);
  end loop;

  update public.user_preferences set
    notifications = case when p_category = 'notifications' then v_cur else notifications end,
    ai            = case when p_category = 'ai'            then v_cur else ai end,
    appearance    = case when p_category = 'appearance'    then v_cur else appearance end,
    workspace     = case when p_category = 'workspace'     then v_cur else workspace end,
    experimental  = case when p_category = 'experimental'  then v_cur else experimental end,
    updated_at    = greatest(clock_timestamp(), v_row.updated_at + interval '1 microsecond')
  where user_id = v_uid;

  return public.af_preferences_json(v_uid);
end $$;

-- ---------------------------------------------------------------------
-- RPC: reset ONE category to defaults (other categories untouched)
-- ---------------------------------------------------------------------
create or replace function public.reset_my_preferences(p_category text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_category is null or public.af_pref_spec() -> p_category is null then
    raise exception 'unknown_category' using errcode = '22023', detail = coalesce(p_category, 'null');
  end if;
  insert into public.user_preferences (user_id)
  select v_uid where exists (select 1 from public.profiles where id = v_uid)
  on conflict (user_id) do nothing;
  update public.user_preferences set
    notifications = case when p_category = 'notifications' then '{}'::jsonb else notifications end,
    ai            = case when p_category = 'ai'            then '{}'::jsonb else ai end,
    appearance    = case when p_category = 'appearance'    then '{}'::jsonb else appearance end,
    workspace     = case when p_category = 'workspace'     then '{}'::jsonb else workspace end,
    experimental  = case when p_category = 'experimental'  then '{}'::jsonb else experimental end,
    updated_at    = greatest(clock_timestamp(), updated_at + interval '1 microsecond')
  where user_id = v_uid;
  return public.af_preferences_json(v_uid);
end $$;

-- ---------------------------------------------------------------------
-- RLS + privileges: read own row only, no direct writes from the browser
-- ---------------------------------------------------------------------
alter table public.user_preferences enable row level security;
drop policy if exists "prefs: read own" on public.user_preferences;
create policy "prefs: read own" on public.user_preferences
  for select to authenticated using (user_id = auth.uid());

revoke all on public.user_preferences from public, anon, authenticated;
grant select on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;

revoke execute on function public.af_pref_spec() from public, anon, authenticated;
revoke execute on function public.af_pref_defaults() from public, anon, authenticated;
revoke execute on function public.af_pref_merge(text, jsonb) from public, anon, authenticated;
revoke execute on function public.af_preferences_json(uuid) from public, anon, authenticated;
revoke execute on function public.af_create_user_preferences() from public, anon, authenticated;
revoke execute on function public.get_my_preferences() from public, anon;
revoke execute on function public.save_my_preferences(text, jsonb, timestamptz) from public, anon;
revoke execute on function public.reset_my_preferences(text) from public, anon;
grant execute on function public.get_my_preferences() to authenticated;
grant execute on function public.save_my_preferences(text, jsonb, timestamptz) to authenticated;
grant execute on function public.reset_my_preferences(text) to authenticated;
grant execute on function public.af_pref_spec(), public.af_pref_defaults(), public.af_pref_merge(text, jsonb),
  public.af_preferences_json(uuid) to service_role;

-- Check (expected: table_ok, rls_ok, rows_match = true; client_cannot_write = true)
select
  to_regclass('public.user_preferences') is not null as table_ok,
  (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass) as rls_ok,
  (select count(*) from public.profiles) = (select count(*) from public.user_preferences) as rows_match,
  not has_table_privilege('authenticated', 'public.user_preferences', 'update') as client_cannot_write;
