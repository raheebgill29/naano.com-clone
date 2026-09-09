-- Allow brands to read invited creator display names on campaign invitations.

drop policy if exists "profiles_select_on_brand_campaign_invite" on public.profiles;
create policy "profiles_select_on_brand_campaign_invite"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'brand'::public.user_role
    and exists (
      select 1
      from public.creators c
      join public.campaign_creators cc on cc.creator_id = c.id
      join public.campaigns cam on cam.id = cc.campaign_id
      where c.profile_id = public.profiles.id
        and cam.brand_id in (
          select id from public.brands b where b.profile_id = auth.uid()
        )
    )
  );

revoke all on function public.prevent_campaign_creator_mutations() from public, anon, authenticated;
