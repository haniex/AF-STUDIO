-- =====================================================================
-- AF STUDIO 3.0 — integration test for user_preferences + AF AI quota.
-- Run in Supabase → SQL Editor AFTER 20261126000001 and 20261126000002.
-- Everything runs inside ONE transaction and is ROLLED BACK at the end:
-- no data is changed. Best in a separate test project; safe in production.
-- Needs at least one registered user (two for the cross-user checks).
-- Expected result: the last SELECT returns  all_tests_passed = true.
-- A failure stops the script with "FAIL: …".  Disable browser auto-translation first.
-- =====================================================================
begin;
select set_config('af.t_a', (select id::text from public.profiles order by created_at limit 1), true);
select set_config('af.t_b', coalesce((select id::text from public.profiles order by created_at offset 1 limit 1), ''), true);

-- ---------------------------------------------------------------- structure, defaults, backfill (as owner)
do $t$ begin if not coalesce((to_regclass('public.user_preferences') is not null), false) then raise exception 'FAIL: table user_preferences exists'; end if; end $t$;
do $t$ begin if not coalesce(((select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass)), false) then raise exception 'FAIL: RLS on user_preferences'; end if; end $t$;
do $t$ begin if not coalesce(((select relrowsecurity from pg_class where oid = 'public.ai_request_events'::regclass)), false) then raise exception 'FAIL: RLS on ai_request_events'; end if; end $t$;
do $t$ begin if not coalesce(((select count(*) from public.profiles) = (select count(*) from public.user_preferences)), false) then raise exception 'FAIL: backfill: one row per profile'; end if; end $t$;
do $t$ begin if not coalesce((public.af_pref_defaults() -> 'notifications' -> 'ai' = '{"in_app": false, "email": false}'::jsonb), false) then raise exception 'FAIL: defaults: AI notifications off'; end if; end $t$;
do $t$ begin if not coalesce(((public.af_pref_defaults() #>> '{appearance,text_scale}')::int = 100), false) then raise exception 'FAIL: defaults: text 100%%'; end if; end $t$;
update public.user_preferences set workspace = '{"page_size": 48}'::jsonb where user_id = current_setting('af.t_a')::uuid;
insert into public.user_preferences (user_id) select id from public.profiles on conflict (user_id) do nothing;
do $t$ begin if not coalesce(((select workspace #>> '{page_size}' from public.user_preferences where user_id = current_setting('af.t_a')::uuid) = '48'), false) then raise exception 'FAIL: backfill never overwrites existing data'; end if; end $t$;

-- ---------------------------------------------------------------- as user A (authenticated)
select set_config('request.jwt.claims', json_build_object('sub', current_setting('af.t_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $t$ begin if not coalesce((auth.uid()::text = current_setting('af.t_a')), false) then raise exception 'FAIL: auth.uid() is user A'; end if; end $t$;
do $t$ begin if not coalesce((jsonb_typeof(public.get_my_preferences() -> 'appearance') = 'object'), false) then raise exception 'FAIL: get_my_preferences works'; end if; end $t$;
do $t$ begin if not coalesce((public.save_my_preferences('appearance', '{"density":"compact","text_scale":110}') #>> '{appearance,density}' = 'compact'), false) then raise exception 'FAIL: partial save'; end if; end $t$;
do $t$ begin if not coalesce((public.get_my_preferences() #>> '{workspace,page_size}' = '48'), false) then raise exception 'FAIL: other category untouched'; end if; end $t$;
do $t$ begin if not coalesce((public.save_my_preferences('notifications', '{"messages":{"email":false}}') -> 'notifications' -> 'messages' = '{"in_app": true, "email": false}'::jsonb), false) then raise exception 'FAIL: channel partial merge'; end if; end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''security'', ''{"role":"admin"}'')';
  exception when others then
    if sqlerrm ilike '%unknown_category%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''security'', ''{"role":"admin"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%unknown_category%%) for: select public.save_my_preferences(''security'', ''{"role":"admin"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''appearance'', ''{"role":"admin"}'')';
  exception when others then
    if sqlerrm ilike '%unknown_key%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''appearance'', ''{"role":"admin"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%unknown_key%%) for: select public.save_my_preferences(''appearance'', ''{"role":"admin"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''appearance'', ''{"is_admin":true}'')';
  exception when others then
    if sqlerrm ilike '%unknown_key%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''appearance'', ''{"is_admin":true}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%unknown_key%%) for: select public.save_my_preferences(''appearance'', ''{"is_admin":true}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''appearance'', ''{"text_scale":150}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''appearance'', ''{"text_scale":150}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''appearance'', ''{"text_scale":150}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''appearance'', ''{"text_scale":"110"}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''appearance'', ''{"text_scale":"110"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''appearance'', ''{"text_scale":"110"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''ai'', ''{"save_history":"yes"}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''ai'', ''{"save_history":"yes"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''ai'', ''{"save_history":"yes"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''notifications'', ''{"messages":{"push":true}}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''notifications'', ''{"messages":{"push":true}}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''notifications'', ''{"messages":{"push":true}}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''notifications'', ''{"quiet_from":"25:00"}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''notifications'', ''{"quiet_from":"25:00"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''notifications'', ''{"quiet_from":"25:00"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''notifications'', ''{"quiet_tz":"x; drop table y"}'')';
  exception when others then
    if sqlerrm ilike '%invalid_value%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''notifications'', ''{"quiet_tz":"x; drop table y"}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_value%%) for: select public.save_my_preferences(''notifications'', ''{"quiet_tz":"x; drop table y"}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''ai'', ''[]'')';
  exception when others then
    if sqlerrm ilike '%invalid_patch%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''ai'', ''[]'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%invalid_patch%%) for: select public.save_my_preferences(''ai'', ''[]'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''ai'', ''{}'')';
  exception when others then
    if sqlerrm ilike '%empty_patch%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''ai'', ''{}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%empty_patch%%) for: select public.save_my_preferences(''ai'', ''{}'')';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''ai'', ''{"response_style":"detailed"}'', ''2000-01-01''::timestamptz)';
  exception when others then
    if sqlerrm ilike '%pref_conflict%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''ai'', ''{"response_style":"detailed"}'', ''2000-01-01''::timestamptz)', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%pref_conflict%%) for: select public.save_my_preferences(''ai'', ''{"response_style":"detailed"}'', ''2000-01-01''::timestamptz)';
end $t$;
do $t$ begin
  begin execute 'update public.user_preferences set appearance = ''{}''';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: update public.user_preferences set appearance = ''{}''', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: update public.user_preferences set appearance = ''{}''';
end $t$;
do $t$ begin
  begin execute 'insert into public.user_preferences (user_id) values (gen_random_uuid())';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: insert into public.user_preferences (user_id) values (gen_random_uuid())', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: insert into public.user_preferences (user_id) values (gen_random_uuid())';
end $t$;
do $t$ begin
  begin execute 'delete from public.user_preferences';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: delete from public.user_preferences', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: delete from public.user_preferences';
end $t$;
do $t$ begin
  begin execute 'select public.reset_my_preferences(''roles'')';
  exception when others then
    if sqlerrm ilike '%unknown_category%' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.reset_my_preferences(''roles'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (%%unknown_category%%) for: select public.reset_my_preferences(''roles'')';
end $t$;
do $t$ begin
  begin execute 'select public.ai_rate_consume(auth.uid(), 100)';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.ai_rate_consume(auth.uid(), 100)', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.ai_rate_consume(auth.uid(), 100)';
end $t$;
do $t$ begin
  begin execute 'select public.ai_rate_peek(auth.uid(), 100)';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.ai_rate_peek(auth.uid(), 100)', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.ai_rate_peek(auth.uid(), 100)';
end $t$;
do $t$ begin
  begin execute 'select public.ai_refund(auth.uid())';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.ai_refund(auth.uid())', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.ai_refund(auth.uid())';
end $t$;
do $t$ begin
  begin execute 'select public.ai_consume(auth.uid(), 100)';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.ai_consume(auth.uid(), 100)', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.ai_consume(auth.uid(), 100)';
end $t$;
do $t$ begin
  begin execute 'select count(*) from public.ai_request_events';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select count(*) from public.ai_request_events', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select count(*) from public.ai_request_events';
end $t$;
do $t$ begin
  begin execute 'update public.ai_usage set count = 0';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: update public.ai_usage set count = 0', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: update public.ai_usage set count = 0';
end $t$;
do $t$ begin if not coalesce(((select count(*) from public.user_preferences where user_id <> auth.uid()) = 0), false) then raise exception 'FAIL: RLS hides other users'' preferences'; end if; end $t$;
do $t$ begin if not coalesce((public.reset_my_preferences('appearance') #>> '{appearance,density}' = 'comfortable'), false) then raise exception 'FAIL: reset appearance'; end if; end $t$;
do $t$ begin if not coalesce((public.get_my_preferences() #>> '{notifications,messages,email}' = 'false'), false) then raise exception 'FAIL: reset keeps other categories'; end if; end $t$;
do $t$ begin if not coalesce((public.is_admin() or (select count(*) from public.ai_settings) = 0), false) then raise exception 'FAIL: ai_settings stays closed to non-admin clients'; end if; end $t$;

-- ---------------------------------------------------------------- user B (if a second account exists)
reset role;
select set_config('request.jwt.claims', json_build_object('sub', nullif(current_setting('af.t_b'), ''), 'role', 'authenticated')::text, true);
set local role authenticated;
do $t$ begin if not coalesce((current_setting('af.t_b') = '' or (select count(*) from public.user_preferences where user_id::text = current_setting('af.t_a')) = 0), false) then raise exception 'FAIL: user B cannot read user A'; end if; end $t$;
do $t$ begin if not coalesce((current_setting('af.t_b') = '' or public.get_my_preferences() #>> '{notifications,messages,email}' = 'true'), false) then raise exception 'FAIL: user B has own defaults, unaffected by A'; end if; end $t$;

-- ---------------------------------------------------------------- anonymous
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
do $t$ begin
  begin execute 'select public.get_my_preferences()';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.get_my_preferences()', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.get_my_preferences()';
end $t$;
do $t$ begin
  begin execute 'select public.save_my_preferences(''ai'', ''{"save_history":false}'')';
  exception when others then
    if sqlstate = '42501' then return; end if;
    raise exception 'FAIL: unexpected error "%" (%) for: select public.save_my_preferences(''ai'', ''{"save_history":false}'')', sqlerrm, sqlstate;
  end;
  raise exception 'FAIL: expected an error (42501) for: select public.save_my_preferences(''ai'', ''{"save_history":false}'')';
end $t$;

-- ---------------------------------------------------------------- quota logic (as owner = like the Edge Function with the service key)
reset role;
delete from public.ai_request_events where user_id = current_setting('af.t_a')::uuid;
do $t$ begin if not coalesce(((public.ai_rate_consume(current_setting('af.t_a')::uuid, 2) ->> 'allowed')::boolean), false) then raise exception 'FAIL: rate #1 allowed'; end if; end $t$;
do $t$ begin if not coalesce(((public.ai_rate_consume(current_setting('af.t_a')::uuid, 2) ->> 'remaining')::int = 0), false) then raise exception 'FAIL: rate #2 allowed, 0 left'; end if; end $t$;
do $t$ begin if not coalesce((not (public.ai_rate_consume(current_setting('af.t_a')::uuid, 2) ->> 'allowed')::boolean), false) then raise exception 'FAIL: rate #3 rejected'; end if; end $t$;
do $t$ begin if not coalesce(((public.ai_rate_consume(current_setting('af.t_a')::uuid, 2) ->> 'retry_after')::int between 1 and 60), false) then raise exception 'FAIL: retry_after within 1..60 s'; end if; end $t$;
do $t$ begin if not coalesce(((public.ai_rate_peek(current_setting('af.t_a')::uuid, 2) ->> 'used')::int = 2), false) then raise exception 'FAIL: rejected requests are not recorded'; end if; end $t$;
do $t$ begin if not coalesce((current_setting('af.t_b') = '' or (public.ai_rate_peek(nullif(current_setting('af.t_b'), '')::uuid, 2) ->> 'used')::int = 0), false) then raise exception 'FAIL: limits are per user'; end if; end $t$;
insert into public.ai_request_events (user_id, created_at) values (current_setting('af.t_a')::uuid, now() - interval '25 hours');
select public.ai_rate_consume(current_setting('af.t_a')::uuid, 100);
do $t$ begin if not coalesce(((select count(*) from public.ai_request_events where user_id = current_setting('af.t_a')::uuid and created_at < now() - interval '24 hours') = 0), false) then raise exception 'FAIL: events older than 24 h are purged'; end if; end $t$;
delete from public.ai_usage where user_id = current_setting('af.t_a')::uuid and day = (now() at time zone 'utc')::date;
do $t$ begin if not coalesce((public.ai_consume(current_setting('af.t_a')::uuid, 1) = 1), false) then raise exception 'FAIL: daily #1 reserved'; end if; end $t$;
do $t$ begin if not coalesce((public.ai_consume(current_setting('af.t_a')::uuid, 1) is null), false) then raise exception 'FAIL: daily limit reached'; end if; end $t$;
do $t$ begin if not coalesce((public.ai_refund(current_setting('af.t_a')::uuid) = 0), false) then raise exception 'FAIL: refund returns the reserved request'; end if; end $t$;
do $t$ begin if not coalesce((public.ai_consume(current_setting('af.t_a')::uuid, 1) = 1), false) then raise exception 'FAIL: reserve again after refund'; end if; end $t$;
do $t$ begin if not coalesce((public.ai_refund(current_setting('af.t_a')::uuid, date '2000-01-01') = 0), false) then raise exception 'FAIL: refund of another day changes nothing'; end if; end $t$;
do $t$ begin if not coalesce(((select count from public.ai_usage where user_id = current_setting('af.t_a')::uuid and day = (now() at time zone 'utc')::date) = 1), false) then raise exception 'FAIL: counter intact after foreign-day refund'; end if; end $t$;
do $t$ begin if not coalesce((public.ai_consume(current_setting('af.t_a')::uuid, 0) is null), false) then raise exception 'FAIL: daily_limit 0 = no requests (never unlimited)'; end if; end $t$;

select true as all_tests_passed;
rollback;
