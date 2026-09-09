-- Realtime for collaboration_messages + client message id for optimistic dedupe

-- Client-generated id for safe optimistic reconcile / retry
alter table public.collaboration_messages
  add column if not exists client_message_id uuid;

create unique index if not exists collaboration_messages_client_id_uidx
  on public.collaboration_messages (campaign_creator_id, client_message_id)
  where client_message_id is not null;

-- Useful query indexes (thread index may already exist)
create index if not exists collaboration_messages_thread_created_idx
  on public.collaboration_messages (campaign_creator_id, created_at desc);

create index if not exists collaboration_messages_sender_created_idx
  on public.collaboration_messages (sender_profile_id, created_at desc);

-- Idempotently add to Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collaboration_messages'
  ) then
    alter publication supabase_realtime add table public.collaboration_messages;
  end if;
end $$;

-- Update send RPC to accept optional client_message_id (idempotent on retry)
create or replace function public.collab_send_message(
  p_campaign_creator_id uuid,
  p_body text,
  p_client_message_id uuid default null
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

  -- Idempotent retry: return existing row for same client id
  if p_client_message_id is not null then
    select * into msg
    from public.collaboration_messages
    where campaign_creator_id = p_campaign_creator_id
      and client_message_id = p_client_message_id;

    if msg.id is not null then
      if msg.sender_profile_id <> uid then
        raise exception 'client_message_id already used' using errcode = '42501';
      end if;
      return msg;
    end if;
  end if;

  begin
    insert into public.collaboration_messages (
      campaign_creator_id, sender_profile_id, body, client_message_id
    ) values (
      p_campaign_creator_id, uid, clean_body, p_client_message_id
    ) returning * into msg;
  exception
    when unique_violation then
      select * into msg
      from public.collaboration_messages
      where campaign_creator_id = p_campaign_creator_id
        and client_message_id = p_client_message_id;
      if msg.id is null then
        raise;
      end if;
      return msg;
  end;

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

revoke all on function public.collab_send_message(uuid, text) from public, anon, authenticated;
revoke all on function public.collab_send_message(uuid, text, uuid) from public, anon;
grant execute on function public.collab_send_message(uuid, text, uuid) to authenticated;

-- Preserve SELECT-only client access; writes stay in security-definer RPC
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
