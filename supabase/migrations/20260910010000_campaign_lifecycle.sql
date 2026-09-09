-- Campaign lifecycle: add paused + secure transitions + events + timestamps

-- ---------------------------------------------------------------------------
-- Enum: paused
-- ---------------------------------------------------------------------------
alter type public.campaign_status add value if not exists 'paused';

-- ---------------------------------------------------------------------------
-- Lifecycle timestamps on campaigns
-- ---------------------------------------------------------------------------
alter table public.campaigns
  add column if not exists activated_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- campaign_events: append-only lifecycle timeline
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  event_type text not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint campaign_events_type_nonempty
    check (char_length(trim(event_type)) > 0)
);

create index if not exists campaign_events_campaign_created_idx
  on public.campaign_events (campaign_id, created_at desc);

alter table public.campaign_events enable row level security;

grant select on public.campaign_events to authenticated;

drop policy if exists "campaign_events_select_brand" on public.campaign_events;
create policy "campaign_events_select_brand"
  on public.campaign_events
  for select
  to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "campaign_events_select_creator" on public.campaign_events;
create policy "campaign_events_select_creator"
  on public.campaign_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaign_creators cc
      join public.creators c on c.id = cc.creator_id
      where cc.campaign_id = public.campaign_events.campaign_id
        and c.profile_id = auth.uid()
    )
  );

create or replace function public.append_campaign_event(
  p_campaign_id uuid,
  p_event_type text,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_events (
    campaign_id, event_type, actor_profile_id, message, metadata
  ) values (
    p_campaign_id,
    trim(p_event_type),
    auth.uid(),
    nullif(trim(coalesce(p_message, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.append_campaign_event(uuid, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers: active collab / complete blockers
-- ---------------------------------------------------------------------------
create or replace function public.campaign_has_active_collaborations(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_creators
    where campaign_id = p_campaign_id
      and status in (
        'accepted'::public.campaign_creator_status,
        'draft_submitted'::public.campaign_creator_status,
        'revision_requested'::public.campaign_creator_status,
        'approved'::public.campaign_creator_status,
        'scheduled'::public.campaign_creator_status,
        'published'::public.campaign_creator_status
      )
  );
$$;

create or replace function public.campaign_has_pending_invitations(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_creators
    where campaign_id = p_campaign_id
      and status = 'booking_pending'::public.campaign_creator_status
  );
$$;

revoke all on function public.campaign_has_active_collaborations(uuid) from public, anon;
revoke all on function public.campaign_has_pending_invitations(uuid) from public, anon;
grant execute on function public.campaign_has_active_collaborations(uuid) to authenticated;
grant execute on function public.campaign_has_pending_invitations(uuid) to authenticated;

-- Notify creators with pending invites or accepted (in-flight) collaborations
create or replace function public.notify_campaign_lifecycle_creators(
  p_campaign_id uuid,
  p_actor uuid,
  p_action text,
  p_title text,
  p_body text,
  p_dedupe_prefix text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select cc.id as campaign_creator_id, c.profile_id as creator_profile_id
    from public.campaign_creators cc
    join public.creators c on c.id = cc.creator_id
    where cc.campaign_id = p_campaign_id
      and cc.status in (
        'booking_pending'::public.campaign_creator_status,
        'accepted'::public.campaign_creator_status,
        'draft_submitted'::public.campaign_creator_status,
        'revision_requested'::public.campaign_creator_status,
        'approved'::public.campaign_creator_status,
        'scheduled'::public.campaign_creator_status,
        'published'::public.campaign_creator_status
      )
  loop
    perform public.create_notification(
      r.creator_profile_id,
      p_actor,
      'campaign_' || p_action,
      p_title,
      p_body,
      case
        when exists (
          select 1 from public.campaign_creators x
          where x.id = r.campaign_creator_id
            and x.status = 'booking_pending'::public.campaign_creator_status
        ) then '/creator/opportunities/' || r.campaign_creator_id::text
        else '/creator/collaborations/' || r.campaign_creator_id::text
      end,
      r.campaign_creator_id,
      p_dedupe_prefix || ':' || r.campaign_creator_id::text
    );
  end loop;
end;
$$;

revoke all on function public.notify_campaign_lifecycle_creators(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Canonical transition RPC
-- ---------------------------------------------------------------------------
create or replace function public.campaign_transition(
  p_campaign_id uuid,
  p_action text
)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  action text := lower(trim(coalesce(p_action, '')));
  row public.campaigns;
  now_ts timestamptz := timezone('utc', now());
  brand_name text;
begin
  if uid is null or public.current_user_role() is distinct from 'brand'::public.user_role then
    raise exception 'Only the owning brand can change campaign status' using errcode = '42501';
  end if;
  if not public.owns_campaign(p_campaign_id) then
    raise exception 'Not your campaign' using errcode = '42501';
  end if;
  if action not in ('activate', 'pause', 'resume', 'complete', 'archive') then
    raise exception 'Unknown campaign action' using errcode = '22023';
  end if;

  select * into row from public.campaigns where id = p_campaign_id for update;
  if row.id is null then
    raise exception 'Campaign not found';
  end if;

  select b.company_name into brand_name
  from public.brands b
  where b.id = row.brand_id;

  -- Idempotent: already in target state
  if action = 'activate' and row.status = 'active'::public.campaign_status then
    return row;
  end if;
  if action = 'pause' and row.status = 'paused'::public.campaign_status then
    return row;
  end if;
  if action = 'resume' and row.status = 'active'::public.campaign_status then
    return row;
  end if;
  if action = 'complete' and row.status = 'completed'::public.campaign_status then
    return row;
  end if;
  if action = 'archive' and row.status = 'archived'::public.campaign_status then
    return row;
  end if;

  if action = 'activate' then
    if row.status <> 'draft'::public.campaign_status then
      raise exception 'Only draft campaigns can be activated';
    end if;
    update public.campaigns
    set status = 'active'::public.campaign_status,
        activated_at = coalesce(activated_at, now_ts),
        paused_at = null
    where id = p_campaign_id
    returning * into row;

    perform public.append_campaign_event(
      p_campaign_id, 'activated', 'Campaign activated', '{}'::jsonb
    );
    perform public.notify_campaign_lifecycle_creators(
      p_campaign_id, uid, 'activated',
      'Campaign activated',
      coalesce(brand_name, 'A brand') || ' activated "' || row.campaign_name || '".',
      'campaign_activated:' || p_campaign_id::text
    );
    return row;
  end if;

  if action = 'pause' then
    if row.status <> 'active'::public.campaign_status then
      raise exception 'Only active campaigns can be paused';
    end if;
    update public.campaigns
    set status = 'paused'::public.campaign_status,
        paused_at = now_ts
    where id = p_campaign_id
    returning * into row;

    perform public.append_campaign_event(
      p_campaign_id, 'paused', 'Campaign paused', '{}'::jsonb
    );
    perform public.notify_campaign_lifecycle_creators(
      p_campaign_id, uid, 'paused',
      'Campaign paused',
      coalesce(brand_name, 'A brand') || ' paused "' || row.campaign_name || '". Existing invitations and collaborations continue.',
      'campaign_paused:' || p_campaign_id::text
    );
    return row;
  end if;

  if action = 'resume' then
    if row.status <> 'paused'::public.campaign_status then
      raise exception 'Only paused campaigns can be resumed';
    end if;
    update public.campaigns
    set status = 'active'::public.campaign_status,
        paused_at = null
    where id = p_campaign_id
    returning * into row;

    perform public.append_campaign_event(
      p_campaign_id, 'resumed', 'Campaign resumed', '{}'::jsonb
    );
    perform public.notify_campaign_lifecycle_creators(
      p_campaign_id, uid, 'resumed',
      'Campaign resumed',
      coalesce(brand_name, 'A brand') || ' resumed "' || row.campaign_name || '".',
      'campaign_resumed:' || p_campaign_id::text
    );
    return row;
  end if;

  if action = 'complete' then
    if row.status not in (
      'active'::public.campaign_status,
      'paused'::public.campaign_status
    ) then
      raise exception 'Only active or paused campaigns can be completed';
    end if;
    if public.campaign_has_pending_invitations(p_campaign_id) then
      raise exception 'Withdraw or resolve pending invitations before completing this campaign';
    end if;
    if public.campaign_has_active_collaborations(p_campaign_id) then
      raise exception 'All accepted collaborations must be completed or cancelled before completing this campaign';
    end if;

    update public.campaigns
    set status = 'completed'::public.campaign_status,
        completed_at = now_ts,
        paused_at = null
    where id = p_campaign_id
    returning * into row;

    perform public.append_campaign_event(
      p_campaign_id, 'completed', 'Campaign completed', '{}'::jsonb
    );
    -- No in-flight creators left by definition; skip noise notifications
    return row;
  end if;

  if action = 'archive' then
    if row.status = 'completed'::public.campaign_status then
      update public.campaigns
      set status = 'archived'::public.campaign_status,
          archived_at = now_ts
      where id = p_campaign_id
      returning * into row;

      perform public.append_campaign_event(
        p_campaign_id, 'archived', 'Campaign archived', '{}'::jsonb
      );
      return row;
    end if;

    if row.status = 'draft'::public.campaign_status then
      if public.campaign_has_active_collaborations(p_campaign_id) then
        raise exception 'Campaigns with active collaborations cannot be archived';
      end if;

      -- Withdraw pending invitations only (preserve history of declined/cancelled)
      update public.campaign_creators
      set status = 'cancelled'::public.campaign_creator_status,
          cancelled_at = now_ts
      where campaign_id = p_campaign_id
        and status = 'booking_pending'::public.campaign_creator_status;

      update public.campaigns
      set status = 'archived'::public.campaign_status,
          archived_at = now_ts
      where id = p_campaign_id
      returning * into row;

      perform public.append_campaign_event(
        p_campaign_id,
        'archived',
        'Draft campaign archived',
        '{}'::jsonb
      );
      return row;
    end if;

    raise exception 'Only draft or completed campaigns can be archived';
  end if;

  raise exception 'Invalid campaign transition';
end;
$$;

revoke all on function public.campaign_transition(uuid, text) from public, anon;
grant execute on function public.campaign_transition(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite eligibility helper (draft + active only)
-- ---------------------------------------------------------------------------
create or replace function public.campaign_accepts_invitations(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns
    where id = p_campaign_id
      and status in (
        'draft'::public.campaign_status,
        'active'::public.campaign_status
      )
  );
$$;

revoke all on function public.campaign_accepts_invitations(uuid) from public, anon;
grant execute on function public.campaign_accepts_invitations(uuid) to authenticated;

-- Tighten invite insert WITH CHECK to invite-eligible campaigns
drop policy if exists "campaign_creators_insert_brand" on public.campaign_creators;
create policy "campaign_creators_insert_brand"
  on public.campaign_creators
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'brand'::public.user_role
    and status = 'booking_pending'::public.campaign_creator_status
    and public.owns_campaign(campaign_id)
    and public.campaign_accepts_invitations(campaign_id)
  );

-- Realtime for campaign status updates on open creator pages
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;
end $$;
