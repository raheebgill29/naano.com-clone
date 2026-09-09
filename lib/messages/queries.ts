import type {
  CollaborationEvent,
  CollaborationMessage,
  CampaignCreatorStatus,
  UserRole,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/collaborations/status";

export type InboxItem = {
  id: string;
  status: CampaignCreatorStatus;
  campaignName: string;
  otherPartyName: string;
  lastPreview: string | null;
  lastAt: string | null;
  unread: boolean;
};

export type ThreadItem =
  | {
      kind: "message";
      id: string;
      body: string;
      senderProfileId: string;
      createdAt: string;
      mine: boolean;
      clientMessageId?: string | null;
      status?: "sent" | "sending" | "failed";
      error?: string | null;
    }
  | {
      kind: "event";
      id: string;
      eventType: string;
      message: string | null;
      createdAt: string;
    };

export async function listMessageInbox(role: UserRole): Promise<{
  items: InboxItem[];
  unreadCount: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0, error: "Not signed in." };

  let collabIds: string[] = [];
  const meta = new Map<
    string,
    {
      status: CampaignCreatorStatus;
      campaignName: string;
      otherPartyName: string;
    }
  >();

  if (role === "brand") {
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!brand) return { items: [], unreadCount: 0, error: null };

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id,campaign_name")
      .eq("brand_id", brand.id);
    const campaignIds = (campaigns ?? []).map((c) => c.id);
    if (!campaignIds.length) return { items: [], unreadCount: 0, error: null };

    const { data: rows, error } = await supabase
      .from("campaign_creators")
      .select("id,status,creator_id,campaign_id,updated_at")
      .in("campaign_id", campaignIds)
      .not("status", "in", "(booking_pending,declined)");
    if (error) return { items: [], unreadCount: 0, error: error.message };

    const creatorIds = (rows ?? []).map((r) => r.creator_id);
    const { data: creators } = creatorIds.length
      ? await supabase
          .from("creators")
          .select("id,profiles!creators_profile_id_fkey(full_name)")
          .in("id", creatorIds)
      : { data: [] as Array<{ id: string; profiles: unknown }> };

    const nameByCreator = new Map(
      ((creators ?? []) as Array<{
        id: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
      }>).map((c) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return [c.id, profile?.full_name ?? "Creator"] as const;
      }),
    );
    const campaignById = new Map(
      (campaigns ?? []).map((c) => [c.id, c.campaign_name]),
    );

    collabIds = (rows ?? []).map((row) => {
      meta.set(row.id, {
        status: row.status as CampaignCreatorStatus,
        campaignName: campaignById.get(row.campaign_id) ?? "Campaign",
        otherPartyName: nameByCreator.get(row.creator_id) ?? "Creator",
      });
      return row.id;
    });
  } else {
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!creator) return { items: [], unreadCount: 0, error: null };

    const { data: rows, error } = await supabase
      .from("campaign_creators")
      .select("id,status,campaign_id,updated_at")
      .eq("creator_id", creator.id)
      .not("status", "in", "(booking_pending,declined)");
    if (error) return { items: [], unreadCount: 0, error: error.message };

    const campaignIds = (rows ?? []).map((r) => r.campaign_id);
    const { data: campaigns } = campaignIds.length
      ? await supabase
          .from("campaigns")
          .select("id,campaign_name,brand_id")
          .in("id", campaignIds)
      : { data: [] as Array<{ id: string; campaign_name: string; brand_id: string }> };

    const brandIds = Array.from(
      new Set((campaigns ?? []).map((c) => c.brand_id)),
    );
    const { data: brands } = brandIds.length
      ? await supabase.from("brands").select("id,company_name").in("id", brandIds)
      : { data: [] as Array<{ id: string; company_name: string }> };

    const brandById = new Map((brands ?? []).map((b) => [b.id, b.company_name]));
    const campaignById = new Map(
      (campaigns ?? []).map((c) => [
        c.id,
        { name: c.campaign_name, brandId: c.brand_id },
      ]),
    );

    collabIds = (rows ?? []).map((row) => {
      const campaign = campaignById.get(row.campaign_id);
      meta.set(row.id, {
        status: row.status as CampaignCreatorStatus,
        campaignName: campaign?.name ?? "Campaign",
        otherPartyName: campaign
          ? (brandById.get(campaign.brandId) ?? "Brand")
          : "Brand",
      });
      return row.id;
    });
  }

  if (!collabIds.length) return { items: [], unreadCount: 0, error: null };

  const [{ data: messages }, { data: reads }] = await Promise.all([
    supabase
      .from("collaboration_messages")
      .select("id,campaign_creator_id,sender_profile_id,body,created_at")
      .in("campaign_creator_id", collabIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("collaboration_thread_reads")
      .select("campaign_creator_id,last_read_at")
      .eq("profile_id", user.id)
      .in("campaign_creator_id", collabIds),
  ]);

  const lastByThread = new Map<
    string,
    { body: string; created_at: string; sender_profile_id: string }
  >();
  const unreadByThread = new Map<string, boolean>();
  const readByThread = new Map(
    (reads ?? []).map((r) => [r.campaign_creator_id, r.last_read_at]),
  );

  for (const msg of messages ?? []) {
    if (!lastByThread.has(msg.campaign_creator_id)) {
      lastByThread.set(msg.campaign_creator_id, {
        body: msg.body,
        created_at: msg.created_at,
        sender_profile_id: msg.sender_profile_id,
      });
    }
    if (msg.sender_profile_id === user.id) continue;
    const lastRead = readByThread.get(msg.campaign_creator_id);
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      unreadByThread.set(msg.campaign_creator_id, true);
    }
  }

  const items: InboxItem[] = collabIds
    .map((id) => {
      const info = meta.get(id)!;
      const last = lastByThread.get(id) ?? null;
      return {
        id,
        status: info.status,
        campaignName: info.campaignName,
        otherPartyName: info.otherPartyName,
        lastPreview: last?.body ?? null,
        lastAt: last?.created_at ?? null,
        unread: unreadByThread.get(id) === true,
      };
    })
    .sort((a, b) => {
      const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return bt - at;
    });

  return {
    items,
    unreadCount: items.filter((i) => i.unread).length,
    error: null,
  };
}

export async function getConversation(role: UserRole, id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      collab: null,
      campaignName: null,
      otherPartyName: null,
      statusLabel: null,
      thread: [] as ThreadItem[],
      error: "Not signed in.",
    };
  }

  const { data: collab, error } = await supabase
    .from("campaign_creators")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      collab: null,
      campaignName: null,
      otherPartyName: null,
      statusLabel: null,
      thread: [],
      error: error.message,
    };
  }
  if (!collab) {
    return {
      collab: null,
      campaignName: null,
      otherPartyName: null,
      statusLabel: null,
      thread: [],
      error: null,
    };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,campaign_name,brand_id")
    .eq("id", collab.campaign_id)
    .maybeSingle();

  let otherPartyName = "Participant";
  if (role === "brand") {
    const { data: creator } = await supabase
      .from("creators")
      .select("profiles!creators_profile_id_fkey(full_name)")
      .eq("id", collab.creator_id)
      .maybeSingle();
    const profile = creator
      ? Array.isArray(creator.profiles)
        ? creator.profiles[0]
        : creator.profiles
      : null;
    otherPartyName =
      (profile as { full_name?: string } | null)?.full_name ?? "Creator";
  } else if (campaign) {
    const { data: brand } = await supabase
      .from("brands")
      .select("company_name")
      .eq("id", campaign.brand_id)
      .maybeSingle();
    otherPartyName = brand?.company_name ?? "Brand";
  }

  const [{ data: messages }, { data: events }] = await Promise.all([
    supabase
      .from("collaboration_messages")
      .select("*")
      .eq("campaign_creator_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("collaboration_events")
      .select("*")
      .eq("campaign_creator_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const thread: ThreadItem[] = [
    ...((messages ?? []) as CollaborationMessage[]).map((m) => ({
      kind: "message" as const,
      id: m.id,
      body: m.body,
      senderProfileId: m.sender_profile_id,
      createdAt: m.created_at,
      mine: m.sender_profile_id === user.id,
      clientMessageId: m.client_message_id,
      status: "sent" as const,
    })),
    ...((events ?? []) as CollaborationEvent[]).map((e) => ({
      kind: "event" as const,
      id: e.id,
      eventType: e.event_type,
      message: e.message,
      createdAt: e.created_at,
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  await supabase.rpc("collab_mark_thread_read", {
    p_campaign_creator_id: id,
  });

  return {
    collab,
    campaignName: campaign?.campaign_name ?? "Campaign",
    otherPartyName,
    statusLabel: STATUS_LABEL[collab.status as CampaignCreatorStatus],
    thread,
    error: null as string | null,
  };
}

export async function countUnreadMessages(role: UserRole) {
  const { unreadCount, error } = await listMessageInbox(role);
  return { count: unreadCount, error };
}
