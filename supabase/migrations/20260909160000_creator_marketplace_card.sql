-- Creator marketplace card fields + saved_creators

create type public.publication_status as enum ('draft', 'published');
create type public.availability_status as enum ('available', 'unavailable');

alter table public.creators
  add column if not exists slug text,
  add column if not exists publication_status public.publication_status not null default 'draft',
  add column if not exists availability public.availability_status not null default 'available',
  add column if not exists location text,
  add column if not exists languages text[] not null default '{}';

-- Backfill stable slugs for any existing rows
update public.creators
set slug = 'creator-' || replace(id::text, '-', '')
where slug is null or trim(slug) = '';

alter table public.creators
  alter column slug set not null;

alter table public.creators
  drop constraint if exists creators_slug_format;

alter table public.creators
  add constraint creators_slug_format
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists creators_slug_key on public.creators (slug);

create index if not exists creators_marketplace_idx
  on public.creators (publication_status, availability, price_cents, audience_size);

create index if not exists creators_languages_gin_idx
  on public.creators using gin (languages);

-- Keep is_discoverable aligned with published + available for existing indexes
create or replace function public.sync_creator_discoverable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_discoverable :=
    new.publication_status = 'published'::public.publication_status
    and new.availability = 'available'::public.availability_status;
  return new;
end;
$$;

drop trigger if exists creators_sync_discoverable on public.creators;
create trigger creators_sync_discoverable
before insert or update on public.creators
for each row
execute function public.sync_creator_discoverable();

update public.creators
set is_discoverable =
  publication_status = 'published'::public.publication_status
  and availability = 'available'::public.availability_status;

-- Prevent slug changes after first set (stability)
create or replace function public.prevent_creator_slug_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    raise exception 'creators.slug cannot be changed'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists creators_prevent_slug_change on public.creators;
create trigger creators_prevent_slug_change
before update on public.creators
for each row
execute function public.prevent_creator_slug_change();

-- ---------------------------------------------------------------------------
-- saved_creators
-- ---------------------------------------------------------------------------
create table if not exists public.saved_creators (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint saved_creators_brand_creator_key unique (brand_id, creator_id)
);

create index if not exists saved_creators_brand_created_idx
  on public.saved_creators (brand_id, created_at desc);

create index if not exists saved_creators_creator_id_idx
  on public.saved_creators (creator_id);

alter table public.saved_creators enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: creators — own full access; brands may read published cards only
-- ---------------------------------------------------------------------------
drop policy if exists "creators_select_own" on public.creators;
drop policy if exists "creators_select_published_for_brands" on public.creators;

create policy "creators_select_own"
  on public.creators
  for select
  to authenticated
  using (profile_id = auth.uid());

create policy "creators_select_published_for_brands"
  on public.creators
  for select
  to authenticated
  using (
    publication_status = 'published'::public.publication_status
    and public.current_user_role() = 'brand'::public.user_role
  );

-- ---------------------------------------------------------------------------
-- RLS: profiles — own row, or display fields for published creators (brands)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_published_creator_names" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_published_creator_names"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1
      from public.creators c
      where c.profile_id = profiles.id
        and c.publication_status = 'published'::public.publication_status
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: saved_creators — owning brand only
-- ---------------------------------------------------------------------------
create policy "saved_creators_select_own"
  on public.saved_creators
  for select
  to authenticated
  using (
    exists (
      select 1 from public.brands b
      where b.id = saved_creators.brand_id
        and b.profile_id = auth.uid()
    )
  );

create policy "saved_creators_insert_own"
  on public.saved_creators
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1 from public.brands b
      where b.id = brand_id
        and b.profile_id = auth.uid()
    )
    and exists (
      select 1 from public.creators c
      where c.id = creator_id
        and c.publication_status = 'published'::public.publication_status
    )
  );

create policy "saved_creators_delete_own"
  on public.saved_creators
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.brands b
      where b.id = saved_creators.brand_id
        and b.profile_id = auth.uid()
    )
  );

grant select, insert, delete on public.saved_creators to authenticated;
