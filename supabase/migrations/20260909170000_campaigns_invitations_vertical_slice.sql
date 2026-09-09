-- Campaign creation + creator invitations (P0 vertical slice)

create type public.campaign_status as enum ('draft', 'active', 'completed', 'archived');

create type public.campaign_creator_status as enum (
  'booking_pending',
  'accepted',
  'declined',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- updated_at triggers already exist: public.set_updated_at()
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- campaigns: brand-owned campaign briefs
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),

  brand_id uuid not null references public.brands (id) on delete cascade,

  campaign_name text not null,
  product_or_company text not null,

  objective text not null,
  description text not null,
  key_messages text[] not null default '{}',
  creator_guidelines text not null,

  deliverable_type text not null,
  post_count integer not null check (post_count > 0),
  target_publish_date timestamptz not null,

  currency text not null default 'USD',
  budget_cents integer not null check (budget_cents >= 0),

  status public.campaign_status not null default 'draft',

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint campaigns_budget_currency_check check (char_length(trim(currency)) > 0)
);

create index if not exists campaigns_brand_created_at_idx
  on public.campaigns (brand_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'campaigns_set_updated_at'
  ) then
    create trigger campaigns_set_updated_at
      before update on public.campaigns
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- campaign_creators: invitation / opportunity rows
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_creators (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete restrict,

  status public.campaign_creator_status not null default 'booking_pending',

  -- Snapshot at invite time so creator edits don't affect prior invitations
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD',
  post_count_snapshot integer not null check (post_count_snapshot > 0),

  decline_reason text,

  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint campaign_creators_unique_campaign_creator unique (campaign_id, creator_id)
);

create index if not exists campaign_creators_creator_status_idx
  on public.campaign_creators (creator_id, status);

create index if not exists campaign_creators_campaign_status_idx
  on public.campaign_creators (campaign_id, status);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'campaign_creators_set_updated_at'
  ) then
    create trigger campaign_creators_set_updated_at
      before update on public.campaign_creators
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Trigger: enforce transition + snapshot integrity
-- ---------------------------------------------------------------------------
create or replace function public.prevent_campaign_creator_mutations()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Immutable fields: brand/creator ownership of the invitation spine.
  if new.campaign_id is distinct from old.campaign_id then
    raise exception 'campaign_id cannot be changed';
  end if;
  if new.creator_id is distinct from old.creator_id then
    raise exception 'creator_id cannot be changed';
  end if;

  -- Immutable snapshot fields
  if new.price_cents is distinct from old.price_cents then
    raise exception 'price_cents snapshot cannot be changed';
  end if;
  if new.currency is distinct from old.currency then
    raise exception 'currency snapshot cannot be changed';
  end if;
  if new.post_count_snapshot is distinct from old.post_count_snapshot then
    raise exception 'post_count_snapshot cannot be changed';
  end if;

  if new.invited_at is distinct from old.invited_at then
    raise exception 'invited_at cannot be changed';
  end if;

  -- Enforce transitions and role ownership.
  if public.current_user_role() = 'creator'::public.user_role then
    if old.status is distinct from 'booking_pending'::public.campaign_creator_status then
      raise exception 'Only pending invitations can be responded to';
    end if;
    if new.status = 'accepted'::public.campaign_creator_status then
      if new.accepted_at is null then
        raise exception 'accepted_at is required when accepting';
      end if;
      return new;
    end if;
    if new.status = 'declined'::public.campaign_creator_status then
      if new.declined_at is null then
        raise exception 'declined_at is required when declining';
      end if;
      return new;
    end if;

    raise exception 'Invalid creator state transition';
  end if;

  if public.current_user_role() = 'brand'::public.user_role then
    if old.status is distinct from 'booking_pending'::public.campaign_creator_status then
      raise exception 'Only pending invitations can be withdrawn';
    end if;
    if new.status = 'cancelled'::public.campaign_creator_status then
      if new.cancelled_at is null then
        raise exception 'cancelled_at is required when withdrawing';
      end if;
      return new;
    end if;
    raise exception 'Invalid brand state transition';
  end if;

  raise exception 'Unsupported role for invitation update';
end;
$$;

drop trigger if exists campaign_creators_prevent_mutations on public.campaign_creators;
create trigger campaign_creators_prevent_mutations
before update on public.campaign_creators
for each row
execute function public.prevent_campaign_creator_mutations();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;
alter table public.campaign_creators enable row level security;
-- brands + creators: extend select policies for invited creators / campaign details

-- grants
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_creators to authenticated;

-- campaigns policies
drop policy if exists "campaigns_select_brand" on public.campaigns;
create policy "campaigns_select_brand"
  on public.campaigns
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      where b.id = brand_id
        and b.profile_id = auth.uid()
    )
  );

drop policy if exists "campaigns_select_creator" on public.campaigns;
create policy "campaigns_select_creator"
  on public.campaigns
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_creators cc
      join public.creators c on c.id = cc.creator_id
      where cc.campaign_id = public.campaigns.id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "campaigns_insert_brand" on public.campaigns;
create policy "campaigns_insert_brand"
  on public.campaigns
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1
      from public.brands b
      where b.id = brand_id
        and b.profile_id = auth.uid()
    )
  );

drop policy if exists "campaigns_update_brand_draft_only" on public.campaigns;
create policy "campaigns_update_brand_draft_only"
  on public.campaigns
  for update
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'draft'::public.campaign_status
    and exists (
      select 1
      from public.brands b
      where b.id = brand_id
        and b.profile_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1
      from public.brands b
      where b.id = brand_id
        and b.profile_id = auth.uid()
    )
  );

-- campaign_creators policies
drop policy if exists "campaign_creators_select_brand" on public.campaign_creators;
create policy "campaign_creators_select_brand"
  on public.campaign_creators
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaigns cam
      join public.brands b on b.id = cam.brand_id
      where cam.id = campaign_id
        and b.profile_id = auth.uid()
    )
  );

drop policy if exists "campaign_creators_select_creator" on public.campaign_creators;
create policy "campaign_creators_select_creator"
  on public.campaign_creators
  for select
  to authenticated
  using (
    creator_id in (
      select id from public.creators where profile_id = auth.uid()
    )
  );

drop policy if exists "campaign_creators_insert_brand" on public.campaign_creators;
create policy "campaign_creators_insert_brand"
  on public.campaign_creators
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'booking_pending'::public.campaign_creator_status
    and exists (
      select 1
      from public.campaigns cam
      join public.brands b on b.id = cam.brand_id
      where cam.id = campaign_id
        and b.profile_id = auth.uid()
    )
  );

drop policy if exists "campaign_creators_update_brand_withdraw" on public.campaign_creators;
create policy "campaign_creators_update_brand_withdraw"
  on public.campaign_creators
  for update
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'booking_pending'::public.campaign_creator_status
    and exists (
      select 1
      from public.campaigns cam
      join public.brands b on b.id = cam.brand_id
      where cam.id = campaign_id
        and b.profile_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'cancelled'::public.campaign_creator_status
    and exists (
      select 1
      from public.campaigns cam
      join public.brands b on b.id = cam.brand_id
      where cam.id = campaign_id
        and b.profile_id = auth.uid()
    )
  );

drop policy if exists "campaign_creators_update_creator_response" on public.campaign_creators;
create policy "campaign_creators_update_creator_response"
  on public.campaign_creators
  for update
  to authenticated
  using (
    creator_id in (select id from public.creators where profile_id = auth.uid())
    and status = 'booking_pending'::public.campaign_creator_status
  )
  with check (
    public.current_user_role() = 'creator'::public.user_role
    and status in ('accepted'::public.campaign_creator_status, 'declined'::public.campaign_creator_status)
  );

-- Extend brands: creators can read brand info for their own invitations.
drop policy if exists "brands_select_on_invitation" on public.brands;
create policy "brands_select_on_invitation"
  on public.brands
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaigns cam
      join public.campaign_creators cc on cc.campaign_id = cam.id
      where cam.brand_id = public.brands.id
        and cc.creator_id in (select id from public.creators where profile_id = auth.uid())
    )
  );

-- Extend creators: brands can read creator cards for their own campaign invitations
-- even if the creator unpublishes after invitation.
drop policy if exists "creators_select_on_brand_campaigns" on public.creators;
create policy "creators_select_on_brand_campaigns"
  on public.creators
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1
      from public.campaign_creators cc
      join public.campaigns cam on cam.id = cc.campaign_id
      where cc.creator_id = public.creators.id
        and cam.brand_id in (select id from public.brands b where b.profile_id = auth.uid())
    )
  );

