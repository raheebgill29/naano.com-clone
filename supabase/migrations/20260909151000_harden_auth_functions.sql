-- Harden function search_path and revoke unintended RPC execute grants

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'profiles.role cannot be changed'
      using errcode = '22023';
  end if;
  if new.id is distinct from old.id then
    raise exception 'profiles.id cannot be changed'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Trigger-only function; not for client RPC
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- Used only inside RLS policies; keep execute for authenticated, revoke anon
revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;
