-- Collaboration messaging + in-app notifications (minimal)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_creator_id uuid not null
    references public.campaign_creators (id) on delete cascade,
  sender_profile_id uuid not null
    references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_messages_body_len
    check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists collaboration_messages_thread_created_idx
  on public.collaboration_messages (campaign_creator_id, created_at desc);

create table if not exists public.collaboration_thread_reads (
  campaign_creator_id uuid not null
    references public.campaign_creators (id) on delete cascade,
  profile_id uuid not null
    references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (campaign_creator_id, profile_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null
    references public.profiles (id) on delete cascade,
  actor_profile_id uuid
    references public.profiles (id) on delete set null,
  type text not null,
  title text not null,
  body text,
  href text not null,
  campaign_creator_id uuid
    references public.campaign_creators (id) on delete set null,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_type_nonempty
    check (char_length(trim(type)) > 0),
  constraint notifications_title_nonempty
    check (char_length(trim(title)) > 0),
  constraint notifications_href_nonempty
    check (char_length(trim(href)) > 0),
  constraint notifications_dedupe_nonempty
    check (char_length(trim(dedupe_key)) > 0),
  constraint notifications_recipient_dedupe_unique
    unique (recipient_profile_id, dedupe_key)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_profile_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Party lookup + notification helper
-- ---------------------------------------------------------------------------
create or replace function public.collaboration_parties(p_campaign_creator_id uuid)
returns table (
  campaign_creator_id uuid,
  brand_profile_id uuid,
  creator_profile_id uuid,
  campaign_name text,
  brand_name text,
  creator_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cc.id,
    b.profile_id,
    c.profile_id,
    cam.campaign_name,
    b.company_name,
    coalesce(cp.full_name, 'Creator')
  from public.campaign_creators cc
  join public.campaigns cam on cam.id = cc.campaign_id
  join public.brands b on b.id = cam.brand_id
  join public.creators c on c.id = cc.creator_id
  join public.profiles cp on cp.id = c.profile_id
  where cc.id = p_campaign_creator_id;
$$;

revoke all on function public.collaboration_parties(uuid) from public, anon;
grant execute on function public.collaboration_parties(uuid) to authenticated;

create or replace function public.create_notification(
  p_recipient_profile_id uuid,
  p_actor_profile_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_href text,
  p_campaign_creator_id uuid,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_profile_id is null then
    return;
  end if;
  -- Never notify the actor
  if p_actor_profile_id is not null
     and p_recipient_profile_id = p_actor_profile_id then
    return;
  end if;

  insert into public.notifications (
    recipient_profile_id,
    actor_profile_id,
    type,
    title,
    body,
    href,
    campaign_creator_id,
    dedupe_key
  ) values (
    p_recipient_profile_id,
    p_actor_profile_id,
    trim(p_type),
    trim(p_title),
    nullif(trim(coalesce(p_body, '')), ''),
    trim(p_href),
    p_campaign_creator_id,
    trim(p_dedupe_key)
  )
  on conflict (recipient_profile_id, dedupe_key) do nothing;
end;
$$;

revoke all on function public.create_notification(uuid, uuid, text, text, text, text, uuid, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Invite / accept / decline / withdraw notifications via triggers
-- ---------------------------------------------------------------------------
create or replace function public.notify_campaign_creator_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  party record;
  actor uuid := auth.uid();
begin
  if new.status <> 'booking_pending'::public.campaign_creator_status then
    return new;
  end if;

  select * into party from public.collaboration_parties(new.id);
  if party.campaign_creator_id is null then
    return new;
  end if;

  perform public.create_notification(
    party.creator_profile_id,
    actor,
    'creator_invited',
    'New campaign invitation',
    party.brand_name || ' invited you to "' || party.campaign_name || '".',
    '/creator/opportunities/' || new.id::text,
    new.id,
    'creator_invited:' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists campaign_creators_notify_insert on public.campaign_creators;
create trigger campaign_creators_notify_insert
after insert on public.campaign_creators
for each row
execute function public.notify_campaign_creator_insert();

create or replace function public.log_campaign_creator_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  party record;
  actor uuid := auth.uid();
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select * into party from public.collaboration_parties(new.id);

  if new.status = 'accepted'::public.campaign_creator_status then
    perform public.append_collaboration_event(
      new.id, 'accepted', 'Invitation accepted', '{}'::jsonb
    );
    if party.campaign_creator_id is not null then
      perform public.create_notification(
        party.brand_profile_id,
        actor,
        'invitation_accepted',
        'Invitation accepted',
        party.creator_name || ' accepted "' || party.campaign_name || '".',
        '/brand/collaborations/' || new.id::text,
        new.id,
        'invitation_accepted:' || new.id::text
      );
    end if;
  elsif new.status = 'declined'::public.campaign_creator_status then
    perform public.append_collaboration_event(
      new.id, 'declined', coalesce(new.decline_reason, 'Invitation declined'), '{}'::jsonb
    );
    if party.campaign_creator_id is not null then
      perform public.create_notification(
        party.brand_profile_id,
        actor,
        'invitation_declined',
        'Invitation declined',
        party.creator_name || ' declined "' || party.campaign_name || '".',
        '/brand/campaigns/' || new.campaign_id::text,
        new.id,
        'invitation_declined:' || new.id::text
      );
    end if;
  elsif new.status = 'cancelled'::public.campaign_creator_status
        and old.status = 'booking_pending'::public.campaign_creator_status then
    perform public.append_collaboration_event(
      new.id, 'invitation_withdrawn', 'Pending invitation withdrawn', '{}'::jsonb
    );
    if party.campaign_creator_id is not null then
      perform public.create_notification(
        party.creator_profile_id,
        actor,
        'invitation_withdrawn',
        'Invitation withdrawn',
        party.brand_name || ' withdrew the invite for "' || party.campaign_name || '".',
        '/creator/opportunities',
        new.id,
        'invitation_withdrawn:' || new.id::text
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

-- ---------------------------------------------------------------------------
-- Patch collaboration RPCs with recipient notifications
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
  party record;
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

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.brand_profile_id,
    uid,
    'draft_submitted',
    'Draft submitted',
    party.creator_name || ' submitted draft v' || next_version || ' for "' || party.campaign_name || '".',
    '/brand/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'draft_submitted:' || p_campaign_creator_id::text || ':v' || next_version::text
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
  uid uuid := auth.uid();
  row public.campaign_creators;
  clean_feedback text := trim(coalesce(p_feedback, ''));
  party record;
  requested_at timestamptz := timezone('utc', now());
begin
  if uid is null or public.current_user_role() <> 'brand'::public.user_role then
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
      revision_requested_at = requested_at
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'revision_requested',
    clean_feedback,
    '{}'::jsonb
  );

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.creator_profile_id,
    uid,
    'revisions_requested',
    'Revisions requested',
    party.brand_name || ' requested revisions on "' || party.campaign_name || '".',
    '/creator/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'revisions_requested:' || p_campaign_creator_id::text || ':' || requested_at::text
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
  uid uuid := auth.uid();
  row public.campaign_creators;
  party record;
  approved_at timestamptz := timezone('utc', now());
begin
  if uid is null or public.current_user_role() <> 'brand'::public.user_role then
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
      approved_at = approved_at
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'approved',
    'Draft approved',
    '{}'::jsonb
  );

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.creator_profile_id,
    uid,
    'draft_approved',
    'Draft approved',
    party.brand_name || ' approved your draft for "' || party.campaign_name || '".',
    '/creator/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'draft_approved:' || p_campaign_creator_id::text || ':' || approved_at::text
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
  uid uuid := auth.uid();
  row public.campaign_creators;
  party record;
  scheduled_at timestamptz := timezone('utc', now());
begin
  if uid is null or public.current_user_role() <> 'brand'::public.user_role then
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
      scheduled_at = scheduled_at
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'scheduled',
    'Publication scheduled',
    jsonb_build_object('scheduled_publish_at', p_scheduled_publish_at)
  );

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.creator_profile_id,
    uid,
    'publication_scheduled',
    'Publication scheduled',
    party.brand_name || ' scheduled "' || party.campaign_name || '".',
    '/creator/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'publication_scheduled:' || p_campaign_creator_id::text || ':' || scheduled_at::text
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
  party record;
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

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.brand_profile_id,
    uid,
    'published_url_submitted',
    'Published URL submitted',
    party.creator_name || ' submitted the live post URL for "' || party.campaign_name || '".',
    '/brand/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'published_url_submitted:' || p_campaign_creator_id::text || ':v' || next_version::text
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
  uid uuid := auth.uid();
  row public.campaign_creators;
  party record;
begin
  if uid is null or public.current_user_role() <> 'brand'::public.user_role then
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

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.creator_profile_id,
    uid,
    'collaboration_completed',
    'Collaboration completed',
    '"' || party.campaign_name || '" was marked complete.',
    '/creator/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'collaboration_completed:' || p_campaign_creator_id::text
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
  uid uuid := auth.uid();
  row public.campaign_creators;
  clean_reason text := trim(coalesce(p_reason, ''));
  party record;
begin
  if uid is null or public.current_user_role() <> 'brand'::public.user_role then
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

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  perform public.create_notification(
    party.creator_profile_id,
    uid,
    'collaboration_cancelled',
    'Collaboration cancelled',
    party.brand_name || ' cancelled "' || party.campaign_name || '".',
    '/creator/collaborations/' || p_campaign_creator_id::text,
    p_campaign_creator_id,
    'collaboration_cancelled:' || p_campaign_creator_id::text
  );

  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Messaging RPCs
-- ---------------------------------------------------------------------------
create or replace function public.collab_send_message(
  p_campaign_creator_id uuid,
  p_body text
)
returns public.collaboration_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role public.user_role := public.current_user_role();
  clean_body text := trim(coalesce(p_body, ''));
  msg public.collaboration_messages;
  party record;
  recipient uuid;
  preview text;
begin
  if uid is null or role is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not (
    public.is_assigned_creator(p_campaign_creator_id)
    or public.owns_campaign_creator(p_campaign_creator_id)
  ) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;
  if char_length(clean_body) = 0 then
    raise exception 'Message cannot be blank' using errcode = '22023';
  end if;
  if char_length(clean_body) > 2000 then
    raise exception 'Message is too long (max 2000 characters)' using errcode = '22023';
  end if;

  insert into public.collaboration_messages (
    campaign_creator_id, sender_profile_id, body
  ) values (
    p_campaign_creator_id, uid, clean_body
  ) returning * into msg;

  select * into party from public.collaboration_parties(p_campaign_creator_id);
  if uid = party.brand_profile_id then
    recipient := party.creator_profile_id;
  else
    recipient := party.brand_profile_id;
  end if;

  preview := left(clean_body, 120);
  perform public.create_notification(
    recipient,
    uid,
    'collaboration_message',
    'New collaboration message',
    preview,
    case
      when recipient = party.brand_profile_id
        then '/brand/messages/' || p_campaign_creator_id::text
      else '/creator/messages/' || p_campaign_creator_id::text
    end,
    p_campaign_creator_id,
    'collaboration_message:' || msg.id::text
  );

  return msg;
end;
$$;

create or replace function public.collab_mark_thread_read(
  p_campaign_creator_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not (
    public.is_assigned_creator(p_campaign_creator_id)
    or public.owns_campaign_creator(p_campaign_creator_id)
  ) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;

  insert into public.collaboration_thread_reads (
    campaign_creator_id, profile_id, last_read_at
  ) values (
    p_campaign_creator_id, uid, timezone('utc', now())
  )
  on conflict (campaign_creator_id, profile_id)
  do update set last_read_at = excluded.last_read_at;

  update public.notifications
  set read_at = timezone('utc', now())
  where recipient_profile_id = uid
    and campaign_creator_id = p_campaign_creator_id
    and type = 'collaboration_message'
    and read_at is null;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.notifications
  set read_at = timezone('utc', now())
  where id = p_notification_id
    and recipient_profile_id = auth.uid()
    and read_at is null;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.notifications
  set read_at = timezone('utc', now())
  where recipient_profile_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.collab_send_message(uuid, text) from public, anon;
revoke all on function public.collab_mark_thread_read(uuid) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;

grant execute on function public.collab_send_message(uuid, text) to authenticated;
grant execute on function public.collab_mark_thread_read(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

grant execute on function public.collab_submit_draft(uuid, text, text, text) to authenticated;
grant execute on function public.collab_request_revision(uuid, text) to authenticated;
grant execute on function public.collab_approve_draft(uuid) to authenticated;
grant execute on function public.collab_schedule(uuid, timestamptz) to authenticated;
grant execute on function public.collab_submit_published_url(uuid, text) to authenticated;
grant execute on function public.collab_complete(uuid) to authenticated;
grant execute on function public.collab_cancel(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.collaboration_messages enable row level security;
alter table public.collaboration_thread_reads enable row level security;
alter table public.notifications enable row level security;

grant select on public.collaboration_messages to authenticated;
grant select, insert, update on public.collaboration_thread_reads to authenticated;
grant select, update on public.notifications to authenticated;

drop policy if exists "collaboration_messages_select_participants"
  on public.collaboration_messages;
create policy "collaboration_messages_select_participants"
  on public.collaboration_messages
  for select
  to authenticated
  using (
    public.is_assigned_creator(campaign_creator_id)
    or public.owns_campaign_creator(campaign_creator_id)
  );

drop policy if exists "collaboration_thread_reads_select_own"
  on public.collaboration_thread_reads;
create policy "collaboration_thread_reads_select_own"
  on public.collaboration_thread_reads
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    and (
      public.is_assigned_creator(campaign_creator_id)
      or public.owns_campaign_creator(campaign_creator_id)
    )
  );

drop policy if exists "collaboration_thread_reads_insert_own"
  on public.collaboration_thread_reads;
create policy "collaboration_thread_reads_insert_own"
  on public.collaboration_thread_reads
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and (
      public.is_assigned_creator(campaign_creator_id)
      or public.owns_campaign_creator(campaign_creator_id)
    )
  );

drop policy if exists "collaboration_thread_reads_update_own"
  on public.collaboration_thread_reads;
create policy "collaboration_thread_reads_update_own"
  on public.collaboration_thread_reads
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (recipient_profile_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());
