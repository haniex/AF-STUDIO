-- =====================================================================
-- AF STUDIO 3.0 — quick diagnostics (read-only, one row).
-- Run in SQL Editor at any moment: before, between or after the 3.0 migrations.
-- Expected after both migrations: every column = true (prefs_rows_ok too).
-- =====================================================================
select
  to_regclass('public.user_preferences') is not null                                   as m1_prefs_table,
  to_regprocedure('public.save_my_preferences(text,jsonb,timestamptz)') is not null     as m1_save_rpc,
  to_regprocedure('public.reset_my_preferences(text)') is not null                      as m1_reset_rpc,
  case when to_regprocedure('public.get_my_preferences()') is null then null
       else has_function_privilege('authenticated', to_regprocedure('public.get_my_preferences()')::oid, 'execute') end
                                                                                        as m1_client_can_read,
  case when to_regprocedure('public.get_my_preferences()') is null then null
       else not has_function_privilege('anon', to_regprocedure('public.get_my_preferences()')::oid, 'execute') end
                                                                                        as m1_anon_blocked,
  case when to_regclass('public.user_preferences') is null then null
       else (select reltuples >= 0 from pg_class where oid = to_regclass('public.user_preferences')) end
                                                                                        as m1_table_readable,
  to_regclass('public.ai_request_events') is not null                                   as m2_events_table,
  to_regprocedure('public.ai_rate_consume(uuid,integer,uuid,integer)') is not null      as m2_rate_rpc,
  to_regprocedure('public.ai_refund(uuid,date)') is not null                            as m2_refund_rpc,
  case when to_regprocedure('public.ai_refund(uuid,date)') is null then null
       else not has_function_privilege('authenticated', to_regprocedure('public.ai_refund(uuid,date)')::oid, 'execute') end
                                                                                        as m2_refund_server_only;

-- After m1 is applied you can also run this line (expected: prefs_rows_ok = true):
-- select (select count(*) from public.profiles) = (select count(*) from public.user_preferences) as prefs_rows_ok;

-- After m2 + the new ai-chat function: send one message in AF AI, then (expected: >= 1):
-- select count(*) as ai_events_last_hour from public.ai_request_events where created_at > now() - interval '1 hour';
