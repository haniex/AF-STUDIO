-- =====================================================================
-- AF STUDIO 2.0 — schema, helper functions, triggers
-- Apply in order: 0001_schema → 0002_rls → 0003_storage → 0004_seed
-- Safe for Supabase (Postgres 15+). Run via `supabase db push` or SQL editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.project_status as enum (
    'new',            -- Новая заявка
    'awaiting',       -- Ожидает ответа
    'brief_approved', -- Бриф согласован
    'concept',        -- Концепция
    'production',     -- Производство
    'review',         -- Проверка
    'revisions',      -- Правки
    'done'            -- Завершён
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_kind as enum ('reference','image','brief','material','moodboard','render','final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending','changes_requested','approved');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES & ROLES
-- Roles live in a SEPARATE table that clients can never write to.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text check (char_length(full_name) <= 120),
  avatar_path   text,
  lang          text not null default 'ru' check (lang in ('ru','en')),
  theme         text not null default 'dark' check (theme in ('light','dark')),
  notify_email  boolean not null default true,
  notify_inapp  boolean not null default true,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin')),
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now()
);

-- Server-side role check. SECURITY DEFINER so RLS on user_roles doesn't recurse.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r where r.user_id = uid and r.role = 'admin');
$$;

-- TRUE only for requests coming from a browser session (JWT role authenticated/anon)
-- that is NOT an admin. Internal operations (GoTrue, service_role Edge Functions,
-- SQL editor) have no such claim and are therefore not restricted by client guards.
create or replace function public.is_client_request()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') in ('authenticated','anon')
     and not public.is_admin();
$$;

-- ---------------------------------------------------------------------
-- CONTENT (managed by admin, readable by authenticated users only)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id          text primary key,                       -- slug: product, arch, character, motion
  title_ru    text not null, title_en text not null,
  desc_ru     text not null default '', desc_en text not null default '',
  features    jsonb not null default '[]'::jsonb,     -- [{ru,en}]
  sort        int not null default 0,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id           text primary key,                      -- slug: haniex, aurora...
  category     text not null check (category in ('product','arch','character','motion')),
  year         text,
  tags         text,
  title_ru     text not null, title_en text not null,
  card_ru      text not null default '', card_en text not null default '',
  lead_ru      text not null default '', lead_en text not null default '',
  desc_ru      text not null default '', desc_en text not null default '',
  brief_ru     text not null default '', brief_en text not null default '',
  solution_ru  text not null default '', solution_en text not null default '',
  tools        text[] not null default '{}',
  time_ru      text not null default '', time_en text not null default '',
  result_ru    text not null default '', result_en text not null default '',
  cover        text not null,                          -- 'images/x.jpg' | storage path | https url
  gallery      text[] not null default '{}',
  sort         int not null default 0,
  published    boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  author     text not null,
  role_ru    text not null default '', role_en text not null default '',
  quote_ru   text not null, quote_en text not null,
  rating     int not null default 5 check (rating between 1 and 5),
  sort       int not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Before/After — ONLY real project materials. Seeded empty on purpose.
create table if not exists public.before_after (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  text references public.portfolio_items(id) on delete set null,
  title_ru      text not null, title_en text not null,
  source_path   text,          -- Исходник (reference/photo/sketch)
  draft_path    text,          -- Черновой вариант (clay/blocking)
  final_path    text not null, -- Готовый рендер
  sort          int not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 3D Lab models (GLB/GLTF). Seeded empty; built-in demo scene is labelled as demo in UI.
create table if not exists public.lab_models (
  id          uuid primary key default gen_random_uuid(),
  title_ru    text not null, title_en text not null,
  model_path  text not null,        -- storage path in portfolio-media or https url to .glb/.gltf
  poster_path text,
  scale       numeric not null default 1,
  sort        int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Pricing (editable by admin). Calculator + AI read from here.
create table if not exists public.pricing_categories (
  id             text primary key,                    -- product, arch, character, motion
  title_ru       text not null, title_en text not null,
  currency       text not null default 'RUB',
  base_min       numeric not null check (base_min >= 0),
  base_max       numeric not null check (base_max >= base_min),
  included_angles int not null default 1,
  per_angle      numeric not null default 0,
  per_object     numeric not null default 0,
  anim_per_sec   numeric not null default 0,
  days_min       int not null default 1,
  days_max       int not null default 7,
  works          jsonb not null default '[]'::jsonb,  -- [{ru,en}] состав работ
  extras_note_ru text not null default '', extras_note_en text not null default '',
  confirmed      boolean not null default false,      -- owner confirmed the numbers
  active         boolean not null default true,
  sort           int not null default 0,
  updated_at     timestamptz not null default now()
);

create table if not exists public.pricing_factors (
  id          text primary key,
  grp         text not null check (grp in ('complexity','detail','extras','urgency')),
  label_ru    text not null, label_en text not null,
  multiplier  numeric not null default 1,             -- price multiplier
  multiplier_max numeric,                             -- optional upper multiplier (e.g. rush +30–50%)
  addon       numeric not null default 0,             -- fixed addon (extras)
  time_mult   numeric not null default 1,             -- timeline multiplier
  sort        int not null default 0,
  active      boolean not null default true
);

-- AI knowledge base & settings
create table if not exists public.kb_articles (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,                           -- services, process, pricing, terms, faq, contacts, about
  title_ru   text not null, title_en text not null,
  body_ru    text not null, body_en text not null,
  published  boolean not null default true,
  sort       int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_settings (
  id                int primary key default 1 check (id = 1),
  enabled           boolean not null default true,
  model             text not null default 'gemini-3.5-flash-lite',
  daily_limit       int not null default 40 check (daily_limit between 0 and 1000),
  per_minute_limit  int not null default 6 check (per_minute_limit between 1 and 60),
  max_input_chars   int not null default 4000,
  extra_instructions text not null default '',
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CLIENT DATA
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  number       bigint generated always as identity unique,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 160),
  service_id   text references public.services(id) on delete set null,
  status       public.project_status not null default 'new',
  brief        jsonb not null default '{}'::jsonb,      -- structured builder answers
  spec_md      text not null default '',                -- generated technical specification
  budget       text,
  deadline     date,
  estimate     jsonb,                                   -- calculator snapshot (client-side, informational)
  contact      jsonb not null default '{}'::jsonb,
  cover_path   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects(client_id, created_at desc);
create index if not exists projects_status_idx on public.projects(status);

create table if not exists public.project_status_history (
  id          bigint generated always as identity primary key,
  project_id  uuid not null references public.projects(id) on delete cascade,
  from_status public.project_status,
  to_status   public.project_status not null,
  changed_by  uuid references auth.users(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists psh_project_idx on public.project_status_history(project_id, created_at);

create table if not exists public.project_drafts (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,  -- whose space the file belongs to
  uploaded_by  uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  kind         public.file_kind not null default 'reference',
  bucket       text not null default 'project-files',
  path         text not null unique,
  name         text not null check (char_length(name) <= 200),
  mime         text not null,
  size         bigint not null check (size > 0 and size <= 52428800),
  created_at   timestamptz not null default now()
);
create index if not exists files_owner_idx on public.files(owner_id, created_at desc);
create index if not exists files_project_idx on public.files(project_id);

create table if not exists public.favorites (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  portfolio_id text not null references public.portfolio_items(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, portfolio_id)
);

create table if not exists public.threads (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete cascade,
  subject          text not null check (char_length(subject) between 1 and 160),
  status           text not null default 'open' check (status in ('open','closed')),
  last_message_at  timestamptz not null default now(),
  last_from_admin  boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists threads_client_idx on public.threads(client_id, last_message_at desc);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.threads(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  from_admin  boolean not null default false,
  body        text not null check (char_length(body) between 1 and 5000),
  meta        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(thread_id, created_at);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'New chat' check (char_length(title) <= 120),
  mode        text not null default 'chat',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ai_conv_user_idx on public.ai_conversations(user_id, updated_at desc);

create table if not exists public.ai_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.ai_conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             text not null check (role in ('user','assistant')),
  content          text not null,
  saved            boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists ai_msg_conv_idx on public.ai_messages(conversation_id, id);
create index if not exists ai_msg_user_time_idx on public.ai_messages(user_id, created_at desc);

create table if not exists public.ai_usage (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null default (now() at time zone 'utc')::date,
  count    int not null default 0,
  primary key (user_id, day)
);

create table if not exists public.moodboards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  title       text not null default 'Moodboard' check (char_length(title) <= 120),
  data        jsonb not null default '{"items":[]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists moodboards_user_idx on public.moodboards(user_id, updated_at desc);

-- Review & revision system
create table if not exists public.review_rounds (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  version     int not null default 1,
  title       text not null,
  image_path  text not null,           -- uploaded by admin to project-files/<client_id>/<project_id>/...
  status      public.review_status not null default 'pending',
  created_by  uuid references auth.users(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists rr_project_idx on public.review_rounds(project_id, version);

create table if not exists public.review_comments (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.review_rounds(id) on delete cascade,
  parent_id   uuid references public.review_comments(id) on delete cascade,
  author_id   uuid references auth.users(id) on delete set null,
  from_admin  boolean not null default false,
  body        text not null check (char_length(body) between 1 and 3000),
  x           numeric check (x is null or (x >= 0 and x <= 1)),
  y           numeric check (y is null or (y >= 0 and y <= 1)),
  created_at  timestamptz not null default now()
);
create index if not exists rc_round_idx on public.review_comments(round_id, created_at);

create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  admin_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HELPERS
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','services','portfolio_items','pricing_categories','kb_articles',
                           'ai_settings','projects','ai_conversations','moodboards'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- Internal notification helpers (NOT executable by clients — see grants in 0002)
create or replace function public.notify_user(p_user uuid, p_type text, p_payload jsonb, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications(user_id, type, payload, link)
  select p_user, p_type, coalesce(p_payload, '{}'::jsonb), p_link
  where exists (select 1 from public.profiles p where p.id = p_user and p.notify_inapp)
     or p_type in ('project_status','project_done','review_request');  -- critical events always delivered
end $$;

create or replace function public.notify_admins(p_type text, p_payload jsonb, p_link text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select user_id from public.user_roles where role = 'admin' loop
    insert into public.notifications(user_id, type, payload, link)
    values (r.user_id, p_type, coalesce(p_payload, '{}'::jsonb), p_link);
  end loop;
end $$;

create or replace function public.audit(p_action text, p_entity text, p_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_audit(admin_id, action, entity, entity_id, data)
  values (auth.uid(), p_action, p_entity, p_id, coalesce(p_data,'{}'::jsonb));
end $$;

-- =====================================================================
-- AUTH → PROFILE
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, lang)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 120),
    case when new.raw_user_meta_data->>'lang' = 'en' then 'en' else 'ru' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Protect privileged profile columns even if someone widens grants later.
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if public.is_client_request() then
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

-- =====================================================================
-- PROJECTS
-- =====================================================================
create or replace function public.project_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  if public.is_client_request() then
    new.client_id := auth.uid();
    new.status := 'new';          -- clients can never choose a status
    select count(*) into recent from public.projects
      where client_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001', hint = 'Too many project requests per hour';
    end if;
  end if;
  if new.client_id is null then raise exception 'client_required'; end if;
  return new;
end $$;
drop trigger if exists trg_project_bi on public.projects;
create trigger trg_project_bi before insert on public.projects
  for each row execute function public.project_before_insert();

create or replace function public.project_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_status_history(project_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, auth.uid());

  insert into public.threads(client_id, project_id, subject, last_from_admin)
  values (new.client_id, new.id, left(new.title, 160), false);

  perform public.notify_admins('project_created',
    jsonb_build_object('project_id', new.id, 'number', new.number, 'title', new.title),
    'admin.html#/projects/' || new.id);
  return new;
end $$;
drop trigger if exists trg_project_ai on public.projects;
create trigger trg_project_ai after insert on public.projects
  for each row execute function public.project_after_insert();

create or replace function public.project_before_update()
returns trigger language plpgsql as $$
begin
  if public.is_client_request() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  new.client_id := old.client_id;  -- ownership is immutable
  new.number := old.number;
  return new;
end $$;
drop trigger if exists trg_project_bu on public.projects;
create trigger trg_project_bu before update on public.projects
  for each row execute function public.project_before_update();

create or replace function public.project_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.project_status_history(project_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), current_setting('af.status_note', true));

    perform public.notify_user(new.client_id,
      case when new.status = 'done' then 'project_done' else 'project_status' end,
      jsonb_build_object('project_id', new.id, 'number', new.number, 'title', new.title,
                         'from', old.status, 'to', new.status),
      '#/projects/' || new.id);

    perform public.audit('status_change', 'project', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
drop trigger if exists trg_project_au on public.projects;
create trigger trg_project_au after update on public.projects
  for each row execute function public.project_after_update();

-- Admin status change with a note (note goes to history)
create or replace function public.admin_set_project_status(p_project uuid, p_status public.project_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform set_config('af.status_note', left(coalesce(p_note,''), 1000), true);
  update public.projects set status = p_status where id = p_project;
  if not found then raise exception 'not_found'; end if;
end $$;


-- =====================================================================
-- FILES
-- =====================================================================
create or replace function public.files_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  if public.is_client_request() then
    new.owner_id := auth.uid();
    if new.kind in ('render','final') then
      raise exception 'forbidden_kind' using errcode = '42501';
    end if;
    if split_part(new.path, '/', 1) <> auth.uid()::text then
      raise exception 'bad_path' using errcode = '42501';
    end if;
    if new.project_id is not null and not exists (
      select 1 from public.projects where id = new.project_id and client_id = auth.uid()) then
      raise exception 'forbidden_project' using errcode = '42501';
    end if;
    select count(*) into cnt from public.files where uploaded_by = auth.uid() and created_at > now() - interval '1 hour';
    if cnt >= 60 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_files_bi on public.files;
create trigger trg_files_bi before insert on public.files
  for each row execute function public.files_before_insert();

create or replace function public.attach_files_to_project(p_project uuid, p_files uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from public.projects where id = p_project and client_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.files set project_id = p_project
   where id = any(p_files) and owner_id = auth.uid() and uploaded_by = auth.uid() and project_id is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- =====================================================================
-- MESSAGES
-- =====================================================================
create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
    new.from_admin := public.is_admin();
  end if;
  new.read_at := null;
  if not new.from_admin and auth.uid() is not null then
    select count(*) into recent from public.messages
      where sender_id = auth.uid() and created_at > now() - interval '5 minutes';
    if recent >= 20 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_bi on public.messages;
create trigger trg_messages_bi before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare th public.threads;
begin
  update public.threads set last_message_at = new.created_at, last_from_admin = new.from_admin, status = 'open'
   where id = new.thread_id returning * into th;
  if new.from_admin then
    perform public.notify_user(th.client_id, 'message',
      jsonb_build_object('thread_id', th.id, 'subject', th.subject, 'preview', left(new.body, 140), 'project_id', th.project_id),
      '#/messages/' || th.id);
  else
    perform public.notify_admins('message',
      jsonb_build_object('thread_id', th.id, 'subject', th.subject, 'preview', left(new.body, 140), 'client_id', th.client_id),
      'admin.html#/messages/' || th.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_ai on public.messages;
create trigger trg_messages_ai after insert on public.messages
  for each row execute function public.messages_after_insert();

create or replace function public.threads_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  if public.is_client_request() then
    new.client_id := auth.uid();
    new.project_id := case when exists(select 1 from public.projects where id = new.project_id and client_id = auth.uid())
                           then new.project_id else null end;
    if new.project_id is null then  -- project threads are created by the system
      select count(*) into recent from public.threads
        where client_id = auth.uid() and project_id is null and created_at > now() - interval '1 hour';
      if recent >= 10 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_threads_bi on public.threads;
create trigger trg_threads_bi before insert on public.threads
  for each row execute function public.threads_before_insert();

create or replace function public.mark_thread_read(p_thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    update public.messages set read_at = now() where thread_id = p_thread and not from_admin and read_at is null;
  elsif exists (select 1 from public.threads where id = p_thread and client_id = auth.uid()) then
    update public.messages set read_at = now() where thread_id = p_thread and from_admin and read_at is null;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
end $$;

-- =====================================================================
-- REVIEW SYSTEM
-- =====================================================================
create or replace function public.review_round_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare pr public.projects;
begin
  select * into pr from public.projects where id = new.project_id;
  perform public.notify_user(pr.client_id, 'review_request',
    jsonb_build_object('project_id', pr.id, 'number', pr.number, 'title', pr.title, 'round_id', new.id, 'version', new.version),
    '#/projects/' || pr.id || '?tab=review');
  return new;
end $$;
drop trigger if exists trg_rr_ai on public.review_rounds;
create trigger trg_rr_ai after insert on public.review_rounds
  for each row execute function public.review_round_after_insert();

create or replace function public.review_comment_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    new.from_admin := public.is_admin();
  end if;
  return new;
end $$;
drop trigger if exists trg_rc_bi on public.review_comments;
create trigger trg_rc_bi before insert on public.review_comments
  for each row execute function public.review_comment_before_insert();

create or replace function public.review_comment_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare pr public.projects;
begin
  select p.* into pr from public.projects p join public.review_rounds r on r.project_id = p.id where r.id = new.round_id;
  if new.from_admin then
    perform public.notify_user(pr.client_id, 'comment',
      jsonb_build_object('project_id', pr.id, 'number', pr.number, 'title', pr.title, 'round_id', new.round_id, 'preview', left(new.body,140)),
      '#/projects/' || pr.id || '?tab=review');
  else
    perform public.notify_admins('comment',
      jsonb_build_object('project_id', pr.id, 'number', pr.number, 'title', pr.title, 'round_id', new.round_id, 'preview', left(new.body,140)),
      'admin.html#/projects/' || pr.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_rc_ai on public.review_comments;
create trigger trg_rc_ai after insert on public.review_comments
  for each row execute function public.review_comment_after_insert();

-- Client decision on a review round (approve / request changes)
create or replace function public.decide_review_round(p_round uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare rr public.review_rounds; pr public.projects;
begin
  if p_decision not in ('approved','changes_requested') then raise exception 'bad_decision'; end if;
  select * into rr from public.review_rounds where id = p_round for update;
  if not found then raise exception 'not_found'; end if;
  select * into pr from public.projects where id = rr.project_id;
  if pr.client_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if rr.status <> 'pending' then raise exception 'already_decided'; end if;

  update public.review_rounds set status = p_decision::public.review_status, decided_at = now() where id = p_round;
  if coalesce(trim(p_note), '') <> '' then
    insert into public.review_comments(round_id, author_id, from_admin, body)
    values (p_round, auth.uid(), false, left(p_note, 3000));
  end if;
  perform public.notify_admins('review_decision',
    jsonb_build_object('project_id', pr.id, 'number', pr.number, 'title', pr.title, 'round_id', p_round, 'decision', p_decision),
    'admin.html#/projects/' || pr.id);
end $$;

-- =====================================================================
-- ADMIN RPCs (all re-check is_admin() on the server)
-- =====================================================================
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'new_requests',     (select count(*) from public.projects where status = 'new'),
    'active_projects',  (select count(*) from public.projects where status not in ('new','done')),
    'done_projects',    (select count(*) from public.projects where status = 'done'),
    'users_total',      (select count(*) from public.profiles),
    'new_users_7d',     (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'unanswered',       (select count(*) from public.threads where status = 'open' and not last_from_admin
                           and exists (select 1 from public.messages m where m.thread_id = threads.id)),
    'ai_requests_today',(select coalesce(sum(count),0) from public.ai_usage where day = (now() at time zone 'utc')::date)
  );
end $$;

create or replace function public.admin_activity(p_days int default 30)
returns table(day date, projects bigint, messages bigint, users bigint, ai bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  with d as (select generate_series((now() - make_interval(days => greatest(1,least(p_days,180)) - 1))::date, now()::date, '1 day')::date as day)
  select d.day,
    (select count(*) from public.projects p where p.created_at::date = d.day),
    (select count(*) from public.messages m where m.created_at::date = d.day),
    (select count(*) from public.profiles u where u.created_at::date = d.day),
    (select coalesce(sum(a.count),0)::bigint from public.ai_usage a where a.day = d.day)
  from d order by d.day;
end $$;

create or replace function public.admin_list_users(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table(id uuid, email text, full_name text, created_at timestamptz, is_admin boolean, projects bigint, last_project_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select p.id, p.email, p.full_name, p.created_at, public.is_admin(p.id),
         (select count(*) from public.projects pr where pr.client_id = p.id),
         (select max(pr.created_at) from public.projects pr where pr.client_id = p.id)
  from public.profiles p
  where p_search is null or p_search = '' or p.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit least(greatest(p_limit,1),200) offset greatest(p_offset,0);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() and not p_admin then raise exception 'cannot_demote_self'; end if;
  if p_admin then
    insert into public.user_roles(user_id, role, granted_by) values (p_user, 'admin', auth.uid())
    on conflict (user_id) do update set role = 'admin', granted_by = auth.uid(), granted_at = now();
  else
    delete from public.user_roles where user_id = p_user;
  end if;
  perform public.audit(case when p_admin then 'grant_admin' else 'revoke_admin' end, 'user', p_user::text, '{}'::jsonb);
end $$;

-- =====================================================================
-- AI quota: atomic "consume one request" used by the ai-chat Edge Function
-- (service_role only — revoked from clients in 0002).
-- =====================================================================
create or replace function public.ai_consume(p_user uuid, p_daily_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if coalesce(p_daily_limit, 0) <= 0 then return null; end if;
  insert into public.ai_usage as u (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
    where u.count < p_daily_limit
  returning u.count into n;
  return n;  -- NULL when the limit is already reached
end $$;
