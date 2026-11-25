-- AF STUDIO: диагностика AF AI. Ожидается одна строка: id=1, enabled=true
select id, enabled, model, daily_limit, per_minute_limit from public.ai_settings;

-- Если строк нет — создайте настройки по умолчанию:
-- insert into public.ai_settings(id) values (1) on conflict (id) do nothing;

-- Если enabled = false — включите:
-- update public.ai_settings set enabled = true where id = 1;
