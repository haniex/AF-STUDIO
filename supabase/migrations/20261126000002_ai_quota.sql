-- =====================================================================
-- AF STUDIO 3.0 — AF AI quota system
-- • public.ai_request_events — журнал запросов для минутного лимита
--   (RLS включён, политик нет, клиентам доступа нет — только service_role).
-- • ai_rate_consume() — атомарный минутный лимитер (advisory lock на пользователя).
-- • ai_rate_peek()    — то же без записи (для статистики).
-- • ai_refund()       — возврат дневного запроса при подтверждённой ошибке генерации.
-- Существующие ai_settings / ai_usage / ai_consume() НЕ изменяются.
-- Безопасно запускать повторно.
-- =====================================================================

create table if not exists public.ai_request_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  request_id  uuid,
  created_at  timestamptz not null default clock_timestamp()
);
create index if not exists ai_request_events_user_time_idx on public.ai_request_events (user_id, created_at desc);

alter table public.ai_request_events enable row level security;
revoke all on public.ai_request_events from public, anon, authenticated;
grant all on public.ai_request_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Atomic per-minute limiter. Serialised per user with a transaction-level
-- advisory lock, so parallel requests cannot both pass the check.
-- Returns {allowed, used, limit, remaining, retry_after, reset_in, window_seconds}.
-- ---------------------------------------------------------------------
create or replace function public.ai_rate_consume(p_user uuid, p_limit int, p_request uuid default null, p_window int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_secs   int := greatest(coalesce(p_window, 60), 1);
  v_win    interval := make_interval(secs => greatest(coalesce(p_window, 60), 1));
  v_limit  int := greatest(coalesce(p_limit, 0), 0);
  v_used   int;
  v_at     timestamptz;
  v_retry  int := 0;
  v_reset  int := 0;
begin
  if p_user is null then raise exception 'user_required' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('af_ai_rate:' || p_user::text, 0));

  -- housekeeping: keep at most 24 h of events for this user
  delete from public.ai_request_events where user_id = p_user and created_at < v_now - interval '24 hours';

  select count(*) into v_used from public.ai_request_events
   where user_id = p_user and created_at > v_now - v_win;

  if v_limit = 0 or v_used >= v_limit then
    -- the slot frees when the (used - limit + 1)-th oldest event leaves the window
    select created_at into v_at from public.ai_request_events
     where user_id = p_user and created_at > v_now - v_win
     order by created_at asc offset greatest(v_used - v_limit, 0) limit 1;
    v_retry := case when v_at is null then v_secs
                    else greatest(1, ceil(extract(epoch from (v_at + v_win - v_now)))::int) end;
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit, 'remaining', 0,
      'retry_after', v_retry, 'reset_in', v_retry, 'window_seconds', v_secs);
  end if;

  insert into public.ai_request_events (user_id, request_id, created_at) values (p_user, p_request, v_now);
  v_used := v_used + 1;

  select min(created_at) into v_at from public.ai_request_events
   where user_id = p_user and created_at > v_now - v_win;
  v_reset := case when v_at is null then 0 else greatest(0, ceil(extract(epoch from (v_at + v_win - v_now)))::int) end;
  if v_used >= v_limit then v_retry := greatest(v_reset, 1); end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit,
    'remaining', greatest(v_limit - v_used, 0), 'retry_after', v_retry, 'reset_in', v_reset, 'window_seconds', v_secs);
end $$;

-- Read-only snapshot of the per-minute window (no event is written)
create or replace function public.ai_rate_peek(p_user uuid, p_limit int, p_window int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_secs   int := greatest(coalesce(p_window, 60), 1);
  v_win    interval := make_interval(secs => greatest(coalesce(p_window, 60), 1));
  v_limit  int := greatest(coalesce(p_limit, 0), 0);
  v_used   int;
  v_at     timestamptz;
  v_retry  int := 0;
  v_reset  int := 0;
begin
  if p_user is null then raise exception 'user_required' using errcode = '22023'; end if;
  select count(*), min(created_at) into v_used, v_at from public.ai_request_events
   where user_id = p_user and created_at > v_now - v_win;
  v_reset := case when v_at is null then 0 else greatest(0, ceil(extract(epoch from (v_at + v_win - v_now)))::int) end;
  if v_limit = 0 or v_used >= v_limit then
    select created_at into v_at from public.ai_request_events
     where user_id = p_user and created_at > v_now - v_win
     order by created_at asc offset greatest(v_used - v_limit, 0) limit 1;
    v_retry := case when v_at is null then v_secs
                    else greatest(1, ceil(extract(epoch from (v_at + v_win - v_now)))::int) end;
  end if;
  return jsonb_build_object('used', v_used, 'limit', v_limit, 'remaining', greatest(v_limit - v_used, 0),
    'retry_after', v_retry, 'reset_in', v_reset, 'window_seconds', v_secs);
end $$;

-- Return one reserved daily request (only after a confirmed generation failure).
create or replace function public.ai_refund(p_user uuid, p_day date default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_user is null then return 0; end if;
  update public.ai_usage set count = count - 1
   where user_id = p_user and day = coalesce(p_day, (now() at time zone 'utc')::date) and count > 0
  returning count into n;
  return coalesce(n, 0);
end $$;

-- Only the server (service_role inside Edge Functions) may call these
revoke execute on function public.ai_rate_consume(uuid, int, uuid, int) from public, anon, authenticated;
revoke execute on function public.ai_rate_peek(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.ai_refund(uuid, date) from public, anon, authenticated;
grant execute on function public.ai_rate_consume(uuid, int, uuid, int) to service_role;
grant execute on function public.ai_rate_peek(uuid, int, int) to service_role;
grant execute on function public.ai_refund(uuid, date) to service_role;
-- keep the existing quota function server-only as well (re-asserted, unchanged)
revoke execute on function public.ai_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, int) to service_role;

-- Check (expected: every column = true)
select
  to_regclass('public.ai_request_events') is not null as events_table_ok,
  not has_table_privilege('authenticated', 'public.ai_request_events', 'select') as client_cannot_read_events,
  not has_function_privilege('authenticated', 'public.ai_rate_consume(uuid, int, uuid, int)', 'execute') as client_cannot_rate,
  not has_function_privilege('authenticated', 'public.ai_refund(uuid, date)', 'execute') as client_cannot_refund;
