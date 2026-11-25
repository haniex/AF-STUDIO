-- AF STUDIO: назначить администратора по email, с которым вы входите на сайт,
-- и сразу отправить тестовое уведомление в Telegram.
-- Если входите с другим email — замените его в ОДНОЙ строке ниже (в кавычках).

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users
where lower(email) = lower('sasha200935ff@gmail.com')
on conflict (user_id) do update set role = 'admin';

insert into public.notifications (user_id, type, payload, link)
select user_id, 'new_user', jsonb_build_object('email', 'test@af-studio', 'name', 'Тестовое уведомление'), 'admin.html#/users'
from public.user_roles where role = 'admin';

-- Результат: должна быть строка с вашим email и is_admin = true.
-- Если строк нет — такого email нет среди зарегистрированных (см. список ниже в users_all).
select u.email, (r.role = 'admin') as is_admin, u.created_at,
       (select string_agg(email, ', ' order by created_at) from auth.users) as users_all
from auth.users u left join public.user_roles r on r.user_id = u.id
order by is_admin desc nulls last, u.created_at
limit 5;
