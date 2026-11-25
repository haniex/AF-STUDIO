-- =====================================================================
-- AF STUDIO 2.1 — extra owner notifications
-- • "new_user": every new registration → administrators (in-app + Telegram)
-- Safe to run several times.
-- =====================================================================
create or replace function public.notify_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('new_user',
    jsonb_build_object('email', new.email, 'name', new.full_name, 'user_id', new.id),
    'admin.html#/users');
  return new;
end $$;

drop trigger if exists trg_profile_new_user on public.profiles;
create trigger trg_profile_new_user after insert on public.profiles
  for each row execute function public.notify_new_user();

revoke execute on function public.notify_new_user() from public, anon, authenticated;

-- Check: expected one row "trg_profile_new_user"
select tgname from pg_trigger where tgname = 'trg_profile_new_user';
