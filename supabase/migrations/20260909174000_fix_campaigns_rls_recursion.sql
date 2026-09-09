-- Fix campaigns <-> campaign_creators RLS recursion.
-- Brand INSERT ... RETURNING evaluates SELECT policies; campaigns_select_creator
-- reads campaign_creators, whose brand policy reads campaigns again.

create or replace function public.owns_campaign(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns cam
    join public.brands b on b.id = cam.brand_id
    where cam.id = p_campaign_id
      and b.profile_id = auth.uid()
  );
$$;

create or replace function public.invited_to_campaign(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_creators cc
    join public.creators c on c.id = cc.creator_id
    where cc.campaign_id = p_campaign_id
      and c.profile_id = auth.uid()
  );
$$;

revoke all on function public.owns_campaign(uuid) from public, anon;
revoke all on function public.invited_to_campaign(uuid) from public, anon;
grant execute on function public.owns_campaign(uuid) to authenticated;
grant execute on function public.invited_to_campaign(uuid) to authenticated;

drop policy if exists "campaigns_select_creator" on public.campaigns;
create policy "campaigns_select_creator"
  on public.campaigns
  for select
  to authenticated
  using (public.invited_to_campaign(id));

drop policy if exists "campaign_creators_select_brand" on public.campaign_creators;
create policy "campaign_creators_select_brand"
  on public.campaign_creators
  for select
  to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "campaign_creators_insert_brand" on public.campaign_creators;
create policy "campaign_creators_insert_brand"
  on public.campaign_creators
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'booking_pending'::public.campaign_creator_status
    and public.owns_campaign(campaign_id)
  );

drop policy if exists "campaign_creators_update_brand_withdraw" on public.campaign_creators;
create policy "campaign_creators_update_brand_withdraw"
  on public.campaign_creators
  for update
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'booking_pending'::public.campaign_creator_status
    and public.owns_campaign(campaign_id)
  )
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'cancelled'::public.campaign_creator_status
    and public.owns_campaign(campaign_id)
  );
