-- Auth + role foundation: profiles, brands, creators, trigger, RLS

create extension if not exists "pgcrypto";

create type public.user_role as enum ('brand', 'creator');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_nonempty check (char_length(trim(full_name)) > 0)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

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

create trigger profiles_prevent_role_change
before update on public.profiles
for each row
execute function public.prevent_profile_role_change();

-- ---------------------------------------------------------------------------
-- brands (brand-specific company profile)
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  company_name text not null,
  website text,
  industry text,
  logo_url text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint brands_company_name_nonempty check (char_length(trim(company_name)) > 0)
);

create index brands_profile_id_idx on public.brands (profile_id);

create trigger brands_set_updated_at
before update on public.brands
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- creators (creator marketplace profile)
-- ---------------------------------------------------------------------------
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  headline text not null,
  bio text,
  topics text[] not null default '{}',
  audience_size integer not null,
  audience_summary text,
  price_cents integer not null,
  currency text not null default 'USD',
  linkedin_url text,
  is_discoverable boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint creators_headline_nonempty check (char_length(trim(headline)) > 0),
  constraint creators_price_check check (price_cents >= 0),
  constraint creators_audience_check check (audience_size >= 0)
);

create index creators_profile_id_idx on public.creators (profile_id);
create index creators_price_cents_idx on public.creators (price_cents);
create index creators_audience_size_idx on public.creators (audience_size);
create index creators_topics_gin_idx on public.creators using gin (topics);
create index creators_discoverable_idx on public.creators (id) where is_discoverable = true;

create trigger creators_set_updated_at
before update on public.creators
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Secure signup trigger: create base profile from validated user metadata
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
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers for RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_role() from anon;
grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.creators enable row level security;

-- profiles: own row only
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No direct INSERT/DELETE for authenticated clients (trigger / cascade only)

-- brands: owner only; role must be brand on write
create policy "brands_select_own"
  on public.brands
  for select
  to authenticated
  using (profile_id = auth.uid());

create policy "brands_insert_own"
  on public.brands
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'brand'::public.user_role
  );

create policy "brands_update_own"
  on public.brands
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'brand'::public.user_role
  );

create policy "brands_delete_own"
  on public.brands
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and public.current_user_role() = 'brand'::public.user_role
  );

-- creators: owner only for private profile management (discovery policies come later)
create policy "creators_select_own"
  on public.creators
  for select
  to authenticated
  using (profile_id = auth.uid());

create policy "creators_insert_own"
  on public.creators
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'creator'::public.user_role
  );

create policy "creators_update_own"
  on public.creators
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'creator'::public.user_role
  );

create policy "creators_delete_own"
  on public.creators
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and public.current_user_role() = 'creator'::public.user_role
  );

-- Table privileges for the authenticated API role (RLS still applies)
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.creators to authenticated;
