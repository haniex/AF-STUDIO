-- AF STUDIO: диагностика Telegram — один запрос, одна строка. Запускайте через 10 секунд после теста.
select
  exists (select 1 from pg_extension where extname = 'pg_net')               as pg_net_ok,
  to_regclass('public.af_internal') is not null                             as settings_ok,
  exists (select 1 from pg_trigger where tgname = 'trg_af_dispatch')         as trigger_ok,
  (select count(*) from public.user_roles where role = 'admin')              as admins,
  (select status_code from net._http_response order by created desc limit 1) as status_code,
  (select left(coalesce(content::text, ''), 400) from net._http_response order by created desc limit 1) as response,
  (select error_msg from net._http_response order by created desc limit 1)   as error_msg,
  (select created from net._http_response order by created desc limit 1)     as last_call;
