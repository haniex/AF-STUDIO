-- =====================================================================
-- AF STUDIO — Telegram / email delivery, all-in-one (replaces 0007).
-- Nothing to edit: the secret is generated automatically and stored in the DB.
-- Run the WHOLE file once. Safe to run again.
-- =====================================================================
create extension if not exists pg_net;

-- clean up the previous attempt (0007), if any part of it exists
drop trigger if exists trg_notifications_dispatch on public.notifications;
do $$ begin
  if to_regprocedure('af_private.dispatch_notification()') is not null then drop function af_private.dispatch_notification(); end if;
  if to_regclass('af_private.settings') is not null then drop table af_private.settings; end if;
end $$;
drop schema if exists af_private;

-- internal settings: RLS on, no policies, no client grants → readable only with the service key
create table if not exists public.af_internal (
  id             int primary key default 1 check (id = 1),
  notify_url     text not null,
  webhook_secret text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
);
alter table public.af_internal enable row level security;
revoke all on public.af_internal from public, anon, authenticated;
grant select on public.af_internal to service_role;

insert into public.af_internal (id, notify_url)
values (1, 'https://iotgzyfqvsuefpqyhvrn.supabase.co/functions/v1/notify')
on conflict (id) do update set notify_url = excluded.notify_url;   -- keeps the existing secret

create or replace function public.af_dispatch_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare cfg public.af_internal;
begin
  select * into cfg from public.af_internal where id = 1;
  if cfg.notify_url is null then return new; end if;
  perform net.http_post(
    url := cfg.notify_url,
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', cfg.webhook_secret),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  raise warning 'af notify dispatch failed: %', sqlerrm;
  return new;
end $$;
revoke execute on function public.af_dispatch_notification() from public, anon, authenticated;

drop trigger if exists trg_af_dispatch on public.notifications;
create trigger trg_af_dispatch after insert on public.notifications
  for each row execute function public.af_dispatch_notification();

-- new-user notifications for admins (same as 0006, included so the order of files does not matter)
create or replace function public.notify_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('new_user', jsonb_build_object('email', new.email, 'name', new.full_name, 'user_id', new.id), 'admin.html#/users');
  return new;
end $$;
revoke execute on function public.notify_new_user() from public, anon, authenticated;
drop trigger if exists trg_profile_new_user on public.profiles;
create trigger trg_profile_new_user after insert on public.profiles for each row execute function public.notify_new_user();

-- TEST message to every admin
insert into public.notifications (user_id, type, payload, link)
select user_id, 'new_user', jsonb_build_object('email', 'test@af-studio', 'name', 'Тестовое уведомление'), 'admin.html#/users'
from public.user_roles where role = 'admin';

-- Result (expected: pg_net_ok = true, trigger_ok = true, admins >= 1)
select exists (select 1 from pg_extension where extname = 'pg_net') as pg_net_ok,
       exists (select 1 from pg_trigger where tgname = 'trg_af_dispatch') as trigger_ok,
       (select count(*) from public.user_roles where role = 'admin') as admins;
