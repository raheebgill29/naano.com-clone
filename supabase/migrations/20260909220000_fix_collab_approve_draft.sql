-- Fix collab_approve_draft: PL/pgSQL variable/column shadowing aborted approval.
-- Also: draft review columns, idempotent approve, schedule var fix, Realtime pubs.

-- ---------------------------------------------------------------------------
-- Draft review metadata on content_submissions
-- ---------------------------------------------------------------------------
alter table public.content_submissions
  add column if not exists review_status text,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.content_submissions
  drop constraint if exists content_submissions_review_status_check;

alter table public.content_submissions
  add constraint content_submissions_review_status_check
  check (
    review_status is null
    or review_status in ('pending', 'approved', 'revision_requested')
  );

-- Backfill latest draft review_status from collaboration status
update public.content_submissions cs
set review_status = case cc.status
  when 'draft_submitted'::public.campaign_creator_status then 'pending'
  when 'revision_requested'::public.campaign_creator_status then 'revision_requested'
  when 'approved'::public.campaign_creator_status then 'approved'
  when 'scheduled'::public.campaign_creator_status then 'approved'
  when 'published'::public.campaign_creator_status then 'approved'
  when 'completed'::public.campaign_creator_status then 'approved'
  else cs.review_status
end,
reviewed_at = case
  when cc.status in (
    'approved'::public.campaign_creator_status,
    'scheduled'::public.campaign_creator_status,
    'published'::public.campaign_creator_status,
    'completed'::public.campaign_creator_status
  ) then coalesce(cs.reviewed_at, cc.approved_at)
  when cc.status = 'revision_requested'::public.campaign_creator_status
    then coalesce(cs.reviewed_at, cc.revision_requested_at)
  else cs.reviewed_at
end
from public.campaign_creators cc
where cs.campaign_creator_id = cc.id
  and cs.submission_type = 'draft'
  and cs.version = (
    select max(cs2.version)
    from public.content_submissions cs2
    where cs2.campaign_creator_id = cs.campaign_creator_id
      and cs2.submission_type = 'draft'
  )
  and cs.review_status is null;

-- Older drafts without review remain null (not conflicting pending)

-- ---------------------------------------------------------------------------
-- Approve draft (fixed assignment + atomic draft review + idempotent)
-- ---------------------------------------------------------------------------
drop function if exists public.collab_approve_draft(uuid);

create or replace function public.collab_approve_draft(
  p_campaign_creator_id uuid,
  p_content_submission_id uuid default null
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
  v_approved_at timestamptz := timezone('utc', now());
  latest_draft public.content_submissions;
begin
  if uid is null or public.current_user_role() is distinct from 'brand'::public.user_role then
    raise exception 'Only the owning brand can approve drafts' using errcode = '42501';
  end if;
  if not public.owns_campaign_creator(p_campaign_creator_id) then
    raise exception 'Not your collaboration' using errcode = '42501';
  end if;

  select * into row
  from public.campaign_creators
  where id = p_campaign_creator_id
  for update;

  if row.id is null then
    raise exception 'Collaboration not found';
  end if;

  -- Idempotent retry: already approved → return without duplicate side effects
  if row.status = 'approved'::public.campaign_creator_status then
    return row;
  end if;

  if row.status <> 'draft_submitted'::public.campaign_creator_status then
    raise exception 'Only a submitted draft can be approved';
  end if;

  select * into latest_draft
  from public.content_submissions
  where campaign_creator_id = p_campaign_creator_id
    and submission_type = 'draft'
  order by version desc
  limit 1
  for update;

  if latest_draft.id is null then
    raise exception 'No draft submission found to approve';
  end if;

  if p_content_submission_id is not null
     and p_content_submission_id <> latest_draft.id then
    raise exception 'Only the latest pending draft version can be approved';
  end if;

  if coalesce(latest_draft.review_status, 'pending') <> 'pending' then
    raise exception 'Only the latest pending draft version can be approved';
  end if;

  update public.content_submissions
  set review_status = 'approved',
      reviewed_by = uid,
      reviewed_at = v_approved_at
  where id = latest_draft.id;

  update public.campaign_creators
  set status = 'approved'::public.campaign_creator_status,
      approved_at = v_approved_at
  where id = p_campaign_creator_id
  returning * into row;

  perform public.append_collaboration_event(
    p_campaign_creator_id,
    'approved',
    'Draft approved',
    jsonb_build_object(
      'draft_id', latest_draft.id,
      'version', latest_draft.version
    )
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
    'draft_approved:' || p_campaign_creator_id::text
  );

  return row;
end;
$$;

revoke all on function public.collab_approve_draft(uuid, uuid) from public, anon;
grant execute on function public.collab_approve_draft(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit draft: mark new version pending
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
    campaign_creator_id, submission_type, version, body, asset_url, notes,
    submitted_by, review_status
  ) values (
    p_campaign_creator_id, 'draft', next_version, clean_body,
    nullif(trim(coalesce(p_asset_url, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    uid,
    'pending'
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

-- ---------------------------------------------------------------------------
-- Request revision: mark latest draft + avoid timestamp var collision style
-- ---------------------------------------------------------------------------
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
  v_requested_at timestamptz := timezone('utc', now());
  latest_draft_id uuid;
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

  select id into latest_draft_id
  from public.content_submissions
  where campaign_creator_id = p_campaign_creator_id
    and submission_type = 'draft'
  order by version desc
  limit 1
  for update;

  if latest_draft_id is not null then
    update public.content_submissions
    set review_status = 'revision_requested',
        reviewed_by = uid,
        reviewed_at = v_requested_at
    where id = latest_draft_id;
  end if;

  update public.campaign_creators
  set status = 'revision_requested'::public.campaign_creator_status,
      latest_feedback = clean_feedback,
      revision_requested_at = v_requested_at
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
    'revisions_requested:' || p_campaign_creator_id::text || ':' || v_requested_at::text
  );

  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Schedule: same variable/column shadowing bug as approve
-- ---------------------------------------------------------------------------
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
  v_scheduled_at timestamptz := timezone('utc', now());
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

  if row.status = 'scheduled'::public.campaign_creator_status
     and row.scheduled_publish_at is not distinct from p_scheduled_publish_at then
    return row;
  end if;

  if row.status <> 'approved'::public.campaign_creator_status then
    raise exception 'Only approved collaborations can be scheduled';
  end if;

  update public.campaign_creators
  set status = 'scheduled'::public.campaign_creator_status,
      scheduled_publish_at = p_scheduled_publish_at,
      scheduled_at = v_scheduled_at
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
    'publication_scheduled:' || p_campaign_creator_id::text
  );

  return row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: collaboration status/draft updates + notifications for the bell
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_creators'
  ) then
    alter publication supabase_realtime add table public.campaign_creators;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_submissions'
  ) then
    alter publication supabase_realtime add table public.content_submissions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
