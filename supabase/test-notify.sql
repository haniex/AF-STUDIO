-- AF STUDIO: отправить тестовое уведомление в Telegram (каждый запуск — одно сообщение)
insert into public.notifications (user_id, type, payload, link)
select user_id, 'new_user', jsonb_build_object('email', 'test@af-studio', 'name', 'Тестовое уведомление'), 'admin.html#/users'
from public.user_roles where role = 'admin' limit 1
returning id, created_at;
