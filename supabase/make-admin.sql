-- AF STUDIO: назначить администратора.
-- Выполнять ПОСЛЕ того, как вы зарегистрировались на сайте и подтвердили email.
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where email = 'enemy1032@gmail.com'
on conflict do nothing;

-- Проверка: должна вернуться одна строка с вашим email
select u.email, r.role, r.granted_at
from public.user_roles r join auth.users u on u.id = r.user_id;
