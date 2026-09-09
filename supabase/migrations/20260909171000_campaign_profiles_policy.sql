-- Fix authenticated profile reads failing due to RLS policy recursion.
-- Root cause: brands_select_on_invitation <-> creators_select_on_brand_campaigns
-- cycle, reached from profiles_select_published_creator_names during login.

-- ---------------------------------------------------------------------------
-- Security-definer helpers (fixed search_path) to break RLS cycles
-- ---------------------------------------------------------------------------
create or replace function public.is_published_creator_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.creators c
    where c.profile_id = p_profile_id
      and c.publication_status = 'published'::public.publication_status
  );
$$;

create or replace function public.creator_invited_to_own_brand_campaign(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_creators cc
    join public.campaigns cam on cam.id = cc.campaign_id
    join public.brands b on b.id = cam.brand_id
    where cc.creator_id = p_creator_id
      and b.profile_id = auth.uid()
  );
$$;

create or replace function public.brand_shared_via_creator_invitation(p_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns cam
    join public.campaign_creators cc on cc.campaign_id = cam.id
    join public.creators c on c.id = cc.creator_id
    where cam.brand_id = p_brand_id
      and c.profile_id = auth.uid()
  );
$$;

create or replace function public.profile_invited_to_own_brand_campaign(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.creators c
    join public.campaign_creators cc on cc.creator_id = c.id
    join public.campaigns cam on cam.id = cc.campaign_id
    join public.brands b on b.id = cam.brand_id
    where c.profile_id = p_profile_id
      and b.profile_id = auth.uid()
  );
$$;

revoke all on function public.is_published_creator_profile(uuid) from public, anon;
revoke all on function public.creator_invited_to_own_brand_campaign(uuid) from public, anon;
revoke all on function public.brand_shared_via_creator_invitation(uuid) from public, anon;
revoke all on function public.profile_invited_to_own_brand_campaign(uuid) from public, anon;

grant execute on function public.is_published_creator_profile(uuid) to authenticated;
grant execute on function public.creator_invited_to_own_brand_campaign(uuid) to authenticated;
grant execute on function public.brand_shared_via_creator_invitation(uuid) to authenticated;
grant execute on function public.profile_invited_to_own_brand_campaign(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace recursive policies
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_published_creator_names" on public.profiles;
create policy "profiles_select_published_creator_names"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and public.is_published_creator_profile(id)
  );

drop policy if exists "profiles_select_on_brand_campaign_invite" on public.profiles;
create policy "profiles_select_on_brand_campaign_invite"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and public.profile_invited_to_own_brand_campaign(id)
  );

drop policy if exists "creators_select_on_brand_campaigns" on public.creators;
create policy "creators_select_on_brand_campaigns"
  on public.creators
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and public.creator_invited_to_own_brand_campaign(id)
  );

drop policy if exists "brands_select_on_invitation" on public.brands;
create policy "brands_select_on_invitation"
  on public.brands
  for select
  to authenticated
  using (public.brand_shared_via_creator_invitation(id));

-- Trigger-only function; not client-callable
revoke all on function public.prevent_campaign_creator_mutations() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Idempotent signup trigger (base profile only; role tables filled at onboarding
-- because brands/creators require non-null business fields)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_name text;
  resolved_role public.user_role;
begin
  meta_role := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
  meta_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  if meta_role not in ('brand', 'creator') then
    raise exception 'Invalid signup role: %', meta_role
      using errcode = '22023';
  end if;

  if char_length(meta_name) = 0 then
    raise exception 'full_name is required in user metadata'
      using errcode = '22023';
  end if;

  resolved_role := meta_role::public.user_role;

  insert into public.profiles (id, role, full_name, avatar_url, onboarding_completed)
  values (
    new.id,
    resolved_role,
    meta_name,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill missing base profiles only from validated auth metadata.
-- Never guess a role. Skip users without recoverable role/name.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, role, full_name, avatar_url, onboarding_completed)
select
  u.id,
  lower(trim(u.raw_user_meta_data ->> 'role'))::public.user_role,
  trim(u.raw_user_meta_data ->> 'full_name'),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), ''),
  false
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and lower(trim(coalesce(u.raw_user_meta_data ->> 'role', ''))) in ('brand', 'creator')
  and char_length(trim(coalesce(u.raw_user_meta_data ->> 'full_name', ''))) > 0
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Secure client RPC: create only the caller's missing base profile
-- ---------------------------------------------------------------------------
create or replace function public.ensure_own_profile(
  p_role public.user_role,
  p_full_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.profiles;
  clean_name text := trim(coalesce(p_full_name, ''));
begin
  if uid is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  if p_role not in ('brand'::public.user_role, 'creator'::public.user_role) then
    raise exception 'Invalid role'
      using errcode = '22023';
  end if;

  if char_length(clean_name) = 0 then
    raise exception 'full_name is required'
      using errcode = '22023';
  end if;

  select * into existing
  from public.profiles
  where id = uid;

  if existing.id is not null then
    return existing;
  end if;

  insert into public.profiles (id, role, full_name, onboarding_completed)
  values (uid, p_role, clean_name, false)
  returning * into existing;

  return existing;
end;
$$;

revoke all on function public.ensure_own_profile(public.user_role, text) from public, anon;
grant execute on function public.ensure_own_profile(public.user_role, text) to authenticated;
