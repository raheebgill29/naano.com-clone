-- Collaboration delivery lifecycle on campaign_creators + versioned drafts + events

-- ---------------------------------------------------------------------------
-- Extend invitation/collaboration status enum
-- ---------------------------------------------------------------------------
alter type public.campaign_creator_status add value if not exists 'draft_submitted';
alter type public.campaign_creator_status add value if not exists 'revision_requested';
alter type public.campaign_creator_status add value if not exists 'approved';
alter type public.campaign_creator_status add value if not exists 'scheduled';
alter type public.campaign_creator_status add value if not exists 'published';
alter type public.campaign_creator_status add value if not exists 'completed';

-- ---------------------------------------------------------------------------
-- Extra columns on campaign_creators (preserve price/currency/post snapshots)
-- ---------------------------------------------------------------------------
alter table public.campaign_creators
  add column if not exists published_url text,
  add column if not exists scheduled_publish_at timestamptz,
  add column if not exists latest_feedback text,
  add column if not exists cancel_reason text,
  add column if not exists revision_requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists scheduled_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- content_submissions: immutable versioned drafts / publish URL history
-- ---------------------------------------------------------------------------
create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null references public.campaign_creators (id) on delete cascade,
  submission_type text not null,
  version integer not null check (version >= 1),
  body text,
  asset_url text,
  published_url text,
  notes text,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint content_submissions_type_check
    check (submission_type in ('draft', 'publish')),
  constraint content_submissions_unique_version
    unique (campaign_creator_id, submission_type, version),
  constraint content_submissions_draft_body_check
    check (
      submission_type <> 'draft'
      or (body is not null and char_length(trim(body)) > 0)
    ),
  constraint content_submissions_publish_url_check
    check (
      submission_type <> 'publish'
      or (published_url is not null and char_length(trim(published_url)) > 0)
    )
);

create index if not exists content_submissions_collab_type_version_idx
  on public.content_submissions (campaign_creator_id, submission_type, version desc);

-- ---------------------------------------------------------------------------
-- collaboration_events: append-only timeline
-- ---------------------------------------------------------------------------
create table if not exists public.collaboration_events (
  id uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null references public.campaign_creators (id) on delete cascade,
  event_type text not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_events_type_nonempty
    check (char_length(trim(event_type)) > 0)
);

create index if not exists collaboration_events_collab_created_idx
  on public.collaboration_events (campaign_creator_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_assigned_creator(p_campaign_creator_id uuid)
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
    where cc.id = p_campaign_creator_id
      and c.profile_id = auth.uid()
  );
$$;

create or replace function public.owns_campaign_creator(p_campaign_creator_id uuid)
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
    where cc.id = p_campaign_creator_id
      and b.profile_id = auth.uid()
  );
$$;

revoke all on function public.is_assigned_creator(uuid) from public, anon;
revoke all on function public.owns_campaign_creator(uuid) from public, anon;
grant execute on function public.is_assigned_creator(uuid) to authenticated;
grant execute on function public.owns_campaign_creator(uuid) to authenticated;

create or replace function public.append_collaboration_event(
  p_campaign_creator_id uuid,
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
  insert into public.collaboration_events (
    campaign_creator_id,
    event_type,
    actor_profile_id,
    message,
    metadata
  ) values (
    p_campaign_creator_id,
    p_event_type,
    auth.uid(),
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.append_collaboration_event(uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Transition trigger (replaces invitation-only validator)
-- ---------------------------------------------------------------------------
create or replace function public.prevent_campaign_creator_mutations()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role public.user_role := public.current_user_role();
begin
  if new.campaign_id is distinct from old.campaign_id
     or new.creator_id is distinct from old.creator_id
     or new.price_cents is distinct from old.price_cents
     or new.currency is distinct from old.currency
     or new.post_count_snapshot is distinct from old.post_count_snapshot
     or new.invited_at is distinct from old.invited_at then
    raise exception 'Immutable collaboration fields cannot be changed';
  end if;

  if old.status in (
    'completed'::public.campaign_creator_status,
    'cancelled'::public.campaign_creator_status,
    'declined'::public.campaign_creator_status
  ) then
    raise exception 'Terminal collaborations are read-only';
  end if;

  -- Creator transitions
  if role = 'creator'::public.user_role then
    if old.status = 'booking_pending'::public.campaign_creator_status
       and new.status = 'accepted'::public.campaign_creator_status then
      if new.accepted_at is null then
        raise exception 'accepted_at is required when accepting';
      end if;
      return new;
    end if;

    if old.status = 'booking_pending'::public.campaign_creator_status
       and new.status = 'declined'::public.campaign_creator_status then
      if new.declined_at is null then
        raise exception 'declined_at is required when declining';
      end if;
      return new;
    end if;

    if old.status in (
         'accepted'::public.campaign_creator_status,
         'revision_requested'::public.campaign_creator_status
       )
       and new.status = 'draft_submitted'::public.campaign_creator_status then
      return new;
    end if;

    if old.status = 'scheduled'::public.campaign_creator_status
       and new.status = 'published'::public.campaign_creator_status then
      if new.published_url is null or char_length(trim(new.published_url)) = 0 then
        raise exception 'published_url is required';
      end if;
      if new.published_at is null then
        raise exception 'published_at is required';
      end if;
      return new;
    end if;

    raise exception 'Invalid creator collaboration transition from % to %', old.status, new.status;
  end if;

  -- Brand transitions
  if role = 'brand'::public.user_role then
    if old.status = 'booking_pending'::public.campaign_creator_status
       and new.status = 'cancelled'::public.campaign_creator_status then
      if new.cancelled_at is null then
        raise exception 'cancelled_at is required when withdrawing';
      end if;
      return new;
    end if;

    if old.status = 'draft_submitted'::public.campaign_creator_status
       and new.status = 'revision_requested'::public.campaign_creator_status then
      if new.latest_feedback is null or char_length(trim(new.latest_feedback)) = 0 then
        raise exception 'Revision feedback is required';
      end if;
      if new.revision_requested_at is null then
        raise exception 'revision_requested_at is required';
      end if;
      return new;
    end if;

    if old.status = 'draft_submitted'::public.campaign_creator_status
       and new.status = 'approved'::public.campaign_creator_status then
      if new.approved_at is null then
        raise exception 'approved_at is required';
      end if;
      return new;
    end if;

    if old.status = 'approved'::public.campaign_creator_status
       and new.status = 'scheduled'::public.campaign_creator_status then
      if new.scheduled_publish_at is null then
        raise exception 'scheduled_publish_at is required';
      end if;
      if new.scheduled_at is null then
        raise exception 'scheduled_at is required';
      end if;
      return new;
    end if;

    if old.status = 'published'::public.campaign_creator_status
       and new.status = 'completed'::public.campaign_creator_status then
      if new.completed_at is null then
        raise exception 'completed_at is required';
      end if;
      return new;
    end if;

    if old.status in (
         'accepted'::public.campaign_creator_status,
         'draft_submitted'::public.campaign_creator_status,
         'revision_requested'::public.campaign_creator_status,
         'approved'::public.campaign_creator_status,
         'scheduled'::public.campaign_creator_status,
         'published'::public.campaign_creator_status
       )
       and new.status = 'cancelled'::public.campaign_creator_status then
      if new.cancelled_at is null then
        raise exception 'cancelled_at is required';
      end if;
      if new.cancel_reason is null or char_length(trim(new.cancel_reason)) = 0 then
        raise exception 'cancel_reason is required';
      end if;
      return new;
    end if;

    raise exception 'Invalid brand collaboration transition from % to %', old.status, new.status;
  end if;

  raise exception 'Unsupported role for collaboration update';
end;
$$;

-- ---------------------------------------------------------------------------
-- Secure transition RPCs
-- ---------------------------------------------------------------------------
create or replace function public.collab_submit_draft(
  p_campaign_creator_id uuid,
  p_body text,
  p_asset_url text default null,
  p_notes text default null
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.campaign_creators;
  next_version integer;
  clean_body text := trim(coalesce(p_body, ''));
begin
  if uid is null or public.current_user_role() <> 'creator'::public.user_role then
    raise exception 'Only the assigned creator can submit drafts' using errcode = '42501';
  end if;
  if not public.is_assigned_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if char_length(clean_body) = 0 then
    raise exception 'Draft text is required' using errcode = '22023';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.id is null then
    raise exception 'Collaboration not found';
  end if;
  if row.status not in (
    'accepted'::public.campaign_creator_status,
    'revision_requested'::public.campaign_creator_status
  ) then
    raise exception 'Draft can only be submitted from accepted or revision_requested';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.content_submissions
  where campaign_creator_id = p_campaign_creator_id
    and submission_type = 'draft';

  insert into public.content_submissions (
    campaign_creator_id, submission_type, version, body, asset_url, notes, submitted_by
  ) values (
    p_campaign_creator_id, 'draft', next_version, clean_body,
    nullif(trim(coalesce(p_asset_url, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    uid
  );

  update public.campaign_creators
  set status = 'draft_submitted'::public.campaign_creator_status,
      latest_feedback = case
        when row.status = 'revision_requested'::public.campaign_creator_status
          then row.latest_feedback
        else null
      end
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'draft_submitted',
    'Draft v' || next_version || ' submitted',
    jsonb_build_object('version', next_version)
  );

  return row;
end;
$$;

create or replace function public.collab_request_revision(
  p_campaign_creator_id uuid,
  p_feedback text
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.campaign_creators;
  clean_feedback text := trim(coalesce(p_feedback, ''));
begin
  if auth.uid() is null or public.current_user_role() <> 'brand'::public.user_role then
    raise exception 'Only the owning brand can request revisions' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if char_length(clean_feedback) = 0 then
    raise exception 'Actionable feedback is required' using errcode = '22023';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status <> 'draft_submitted'::public.campaign_creator_status then
    raise exception 'Revisions can only be requested on a submitted draft';
  end if;

  update public.campaign_creators
  set status = 'revision_requested'::public.campaign_creator_status,
      latest_feedback = clean_feedback,
      revision_requested_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'revision_requested',
    clean_feedback,
    '{}'::jsonb
  );

  return row;
end;
$$;

create or replace function public.collab_approve_draft(
  p_campaign_creator_id uuid
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.campaign_creators;
begin
  if auth.uid() is null or public.current_user_role() <> 'brand'::public.user_role then
    raise exception 'Only the owning brand can approve drafts' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status <> 'draft_submitted'::public.campaign_creator_status then
    raise exception 'Only a submitted draft can be approved';
  end if;

  update public.campaign_creators
  set status = 'approved'::public.campaign_creator_status,
      approved_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'approved',
    'Draft approved',
    '{}'::jsonb
  );

  return row;
end;
$$;

create or replace function public.collab_schedule(
  p_campaign_creator_id uuid,
  p_scheduled_publish_at timestamptz
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.campaign_creators;
begin
  if auth.uid() is null or public.current_user_role() <> 'brand'::public.user_role then
    raise exception 'Only the owning brand can schedule' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if p_scheduled_publish_at is null then
    raise exception 'Scheduled publish date is required' using errcode = '22023';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status <> 'approved'::public.campaign_creator_status then
    raise exception 'Only approved collaborations can be scheduled';
  end if;

  update public.campaign_creators
  set status = 'scheduled'::public.campaign_creator_status,
      scheduled_publish_at = p_scheduled_publish_at,
      scheduled_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'scheduled',
    'Publication scheduled',
    jsonb_build_object('scheduled_publish_at', p_scheduled_publish_at)
  );

  return row;
end;
$$;

create or replace function public.collab_submit_published_url(
  p_campaign_creator_id uuid,
  p_published_url text
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.campaign_creators;
  clean_url text := trim(coalesce(p_published_url, ''));
  next_version integer;
begin
  if uid is null or public.current_user_role() <> 'creator'::public.user_role then
    raise exception 'Only the assigned creator can submit the published URL' using errcode = '42501';
  end if;
  if not public.is_assigned_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if clean_url !~* '^https?://([a-z0-9-]+\.)*linkedin\.com/.+' then
    raise exception 'A valid LinkedIn post URL is required' using errcode = '22023';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status <> 'scheduled'::public.campaign_creator_status then
    raise exception 'Published URL can only be submitted after scheduling';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.content_submissions
  where campaign_creator_id = p_campaign_creator_id
    and submission_type = 'publish';

  insert into public.content_submissions (
    campaign_creator_id, submission_type, version, published_url, submitted_by
  ) values (
    p_campaign_creator_id, 'publish', next_version, clean_url, uid
  );

  update public.campaign_creators
  set status = 'published'::public.campaign_creator_status,
      published_url = clean_url,
      published_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'published',
    'Published LinkedIn URL submitted',
    jsonb_build_object('published_url', clean_url)
  );

  return row;
end;
$$;

create or replace function public.collab_complete(
  p_campaign_creator_id uuid
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.campaign_creators;
begin
  if auth.uid() is null or public.current_user_role() <> 'brand'::public.user_role then
    raise exception 'Only the owning brand can complete collaborations' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status <> 'published'::public.campaign_creator_status then
    raise exception 'Only published collaborations can be completed';
  end if;
  if row.published_url is null then
    raise exception 'Published URL is required before completion';
  end if;

  update public.campaign_creators
  set status = 'completed'::public.campaign_creator_status,
      completed_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'completed',
    'Collaboration marked complete',
    '{}'::jsonb
  );

  return row;
end;
$$;

create or replace function public.collab_cancel(
  p_campaign_creator_id uuid,
  p_reason text
)
returns public.campaign_creators
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.campaign_creators;
  clean_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null or public.current_user_role() <> 'brand'::public.user_role then
    raise exception 'Only the owning brand can cancel collaborations' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if char_length(clean_reason) = 0 then
    raise exception 'Cancellation reason is required' using errcode = '22023';
  end if;

  select * into row from public.campaign_creators where id = p_campaign_creator_id for update;
  if row.status not in (
    'accepted'::public.campaign_creator_status,
    'draft_submitted'::public.campaign_creator_status,
    'revision_requested'::public.campaign_creator_status,
    'approved'::public.campaign_creator_status,
    'scheduled'::public.campaign_creator_status,
    'published'::public.campaign_creator_status
  ) then
    raise exception 'This collaboration cannot be cancelled';
  end if;

  update public.campaign_creators
  set status = 'cancelled'::public.campaign_creator_status,
      cancel_reason = clean_reason,
      cancelled_at = timezone('utc', now())
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'cancelled',
    clean_reason,
    '{}'::jsonb
  );

  return row;
end;
$$;

revoke all on function public.collab_submit_draft(uuid, text, text, text) from public, anon;
revoke all on function public.collab_request_revision(uuid, text) from public, anon;
revoke all on function public.collab_approve_draft(uuid) from public, anon;
revoke all on function public.collab_schedule(uuid, timestamptz) from public, anon;
revoke all on function public.collab_submit_published_url(uuid, text) from public, anon;
revoke all on function public.collab_complete(uuid) from public, anon;
revoke all on function public.collab_cancel(uuid, text) from public, anon;

grant execute on function public.collab_submit_draft(uuid, text, text, text) to authenticated;
grant execute on function public.collab_request_revision(uuid, text) to authenticated;
grant execute on function public.collab_approve_draft(uuid) to authenticated;
grant execute on function public.collab_schedule(uuid, timestamptz) to authenticated;
grant execute on function public.collab_submit_published_url(uuid, text) to authenticated;
grant execute on function public.collab_complete(uuid) to authenticated;
grant execute on function public.collab_cancel(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
alter table public.content_submissions enable row level security;
alter table public.collaboration_events enable row level security;

grant select on public.content_submissions to authenticated;
grant select on public.collaboration_events to authenticated;
-- inserts/updates happen via security definer RPCs only

drop policy if exists "content_submissions_select_participants" on public.content_submissions;
create policy "content_submissions_select_participants"
  on public.content_submissions
  for select
  to authenticated
  using (
    public.is_assigned_creator(campaign_creator_id)
    or public.owns_campaign_creator(campaign_creator_id)
  );

drop policy if exists "collaboration_events_select_participants" on public.collaboration_events;
create policy "collaboration_events_select_participants"
  on public.collaboration_events
  for select
  to authenticated
  using (
    public.is_assigned_creator(campaign_creator_id)
    or public.owns_campaign_creator(campaign_creator_id)
  );

-- Log acceptance events for existing accept path (client update)
create or replace function public.log_campaign_creator_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'accepted'::public.campaign_creator_status then
      perform public.append_collaboration_event(
        new.id, 'accepted', 'Invitation accepted', '{}'::jsonb
      );
    elsif new.status = 'declined'::public.campaign_creator_status then
      perform public.append_collaboration_event(
        new.id, 'declined', coalesce(new.decline_reason, 'Invitation declined'), '{}'::jsonb
      );
    elsif new.status = 'cancelled'::public.campaign_creator_status
          and old.status = 'booking_pending'::public.campaign_creator_status then
      perform public.append_collaboration_event(
        new.id, 'invitation_withdrawn', 'Pending invitation withdrawn', '{}'::jsonb
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_creators_log_status_event on public.campaign_creators;
create trigger campaign_creators_log_status_event
after update of status on public.campaign_creators
for each row
execute function public.log_campaign_creator_status_event();

revoke all on function public.log_campaign_creator_status_event() from public, anon, authenticated;
