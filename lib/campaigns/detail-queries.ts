import {
  buildCampaignActivity,
  type CampaignDetailActivityItem,
  type CampaignDetailInvitation,
} from "@/lib/campaigns/detail-data";
import { computeCampaignStats } from "@/lib/campaigns/list-data";
import { listMessageInbox } from "@/lib/messages/queries";
import type {
  Campaign,
  CampaignCreatorStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type BrandCampaignDetailPayload = {
  campaign: Campaign | null;
  invitations: CampaignDetailInvitation[];
  activity: CampaignDetailActivityItem[];
  stats: ReturnType<typeof computeCampaignStats>;
  potentialCostCents: number;
  committedCostCents: number;
  error: string | null;
  inviteError: string | null;
  loadedAtMs: number;
};

const COST_ACTIVE: CampaignCreatorStatus[] = [
  "accepted",
  "draft_submitted",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
];

export async function loadBrandCampaignDetail(
  brandId: string,
  campaignId: string,
): Promise<BrandCampaignDetailPayload> {
  const loadedAtMs = Date.now();
  const supabase = await createClient();

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (campaignErr) {
    return emptyPayload(campaignErr.message, loadedAtMs);
  }
  if (!campaign) {
    return emptyPayload(null, loadedAtMs);
  }

  const [{ data: invites, error: inviteError }, inbox, { data: campaignEvents }] =
    await Promise.all([
      supabase
        .from("campaign_creators")
        .select(
          "id,status,creator_id,price_cents,currency,post_count_snapshot,decline_reason,invited_at,accepted_at,declined_at,cancelled_at,updated_at,scheduled_publish_at",
        )
        .eq("campaign_id", campaignId)
        .order("invited_at", { ascending: false }),
      listMessageInbox("brand"),
      supabase
        .from("campaign_events")
        .select("id,event_type,message,actor_profile_id,created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false }),
    ]);

  const inviteRows = invites ?? [];
  const creatorIds = inviteRows.map((i) => i.creator_id);
  const collabIds = inviteRows.map((i) => i.id);

  const [{ data: creators }, { data: collabEvents }] = await Promise.all([
    creatorIds.length
      ? supabase
          .from("creators")
          .select(
            "id,slug,headline,profiles!creators_profile_id_fkey(full_name)",
          )
          .in("id", creatorIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            slug: string;
            headline: string;
            profiles: unknown;
          }>,
        }),
    collabIds.length
      ? supabase
          .from("collaboration_events")
          .select(
            "id,campaign_creator_id,event_type,message,actor_profile_id,created_at",
          )
          .in("campaign_creator_id", collabIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            campaign_creator_id: string;
            event_type: string;
            message: string | null;
            actor_profile_id: string | null;
            created_at: string;
          }>,
        }),
  ]);

  type CreatorJoin = {
    id: string;
    slug: string;
    headline: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  };

  const creatorById = new Map(
    ((creators ?? []) as unknown as CreatorJoin[]).map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return [
        c.id,
        {
          id: c.id,
          slug: c.slug,
          headline: c.headline,
          full_name: profile?.full_name ?? "Creator",
        },
      ];
    }),
  );

  const unreadById = new Map(
    inbox.items.map((row) => [row.id, row.unread] as const),
  );

  const invitations: CampaignDetailInvitation[] = inviteRows.map((inv) => ({
    id: inv.id,
    status: inv.status as CampaignCreatorStatus,
    creator_id: inv.creator_id,
    price_cents: inv.price_cents,
    currency: inv.currency,
    post_count_snapshot: inv.post_count_snapshot,
    decline_reason: inv.decline_reason,
    invited_at: inv.invited_at,
    accepted_at: inv.accepted_at,
    declined_at: inv.declined_at,
    cancelled_at: inv.cancelled_at,
    updated_at: inv.updated_at,
    scheduled_publish_at: inv.scheduled_publish_at,
    creator: creatorById.get(inv.creator_id) ?? null,
    unread: unreadById.get(inv.id) === true,
  }));

  const actorIds = Array.from(
    new Set(
      [
        ...(campaignEvents ?? []).map((e) => e.actor_profile_id),
        ...(collabEvents ?? []).map((e) => e.actor_profile_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };

  const actorNames = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name] as const),
  );

  const stats = computeCampaignStats(invitations);

  const potentialCostCents = invitations
    .filter(
      (i) =>
        i.status === "booking_pending" || COST_ACTIVE.includes(i.status),
    )
    .reduce((sum, i) => sum + i.price_cents * i.post_count_snapshot, 0);

  const committedCostCents = invitations
    .filter((i) => COST_ACTIVE.includes(i.status))
    .reduce((sum, i) => sum + i.price_cents * i.post_count_snapshot, 0);

  const activity = buildCampaignActivity({
    campaign: campaign as Campaign,
    invitations,
    campaignEvents: campaignEvents ?? [],
    collabEvents: collabEvents ?? [],
    actorNames,
  });

  return {
    campaign: campaign as Campaign,
    invitations,
    activity,
    stats,
    potentialCostCents,
    committedCostCents,
    error: null,
    inviteError: inviteError?.message ?? null,
    loadedAtMs,
  };
}

function emptyPayload(
  error: string | null,
  loadedAtMs: number,
): BrandCampaignDetailPayload {
  return {
    campaign: null,
    invitations: [],
    activity: [],
    stats: {
      invited: 0,
      pending: 0,
      active: 0,
      draftsAwaitingReview: 0,
      completed: 0,
      declinedOrCancelled: 0,
      committedCents: 0,
    },
    potentialCostCents: 0,
    committedCostCents: 0,
    error,
    inviteError: null,
    loadedAtMs,
  };
}
