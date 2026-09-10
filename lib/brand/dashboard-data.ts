import {
  ACTIVE_CAMPAIGN_COLLAB_STATUSES,
  analyzeCampaignLifecycleBlockers,
  CAMPAIGN_STATUS_LABEL,
} from "@/lib/campaigns/status";
import { ACTIVE_COLLAB_STATUSES } from "@/lib/collaborations/status";
import { countUnreadMessages } from "@/lib/messages/queries";
import type {
  Brand,
  CampaignCreatorStatus,
  CampaignStatus,
  Profile,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type BrandDashboardMetrics = {
  activeCampaigns: number;
  activeCollaborations: number;
  draftsAwaitingReview: number;
  completedCollaborations: number;
  pendingInvites: number;
  unreadMessages: number;
};

export type AttentionItem = {
  id: string;
  kind:
    | "draft_review"
    | "schedule"
    | "complete_collab"
    | "pending_invite"
    | "unread_messages"
    | "deadline"
    | "blocked_complete";
  title: string;
  context: string;
  statusLabel: string;
  statusTone: "urgent" | "warning" | "info" | "neutral";
  href: string;
  actionLabel: string;
  sortPriority: number;
  sortAt: string;
};

export type CampaignRosterCreator = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ActiveCampaignCard = {
  id: string;
  name: string;
  status: CampaignStatus;
  statusLabel: string;
  targetPublishDate: string;
  budgetCents: number;
  currency: string;
  pendingInvites: number;
  activeCollaborations: number;
  completedCollaborations: number;
  totalInvitations: number;
  progressLabel: string;
  progressPercent: number;
  roster: CampaignRosterCreator[];
  nextMilestone: string;
  nextAction: { label: string; href: string };
};

export type RecommendedCreator = {
  id: string;
  slug: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  audienceSize: number;
  priceCents: number;
  currency: string;
  topics: string[];
};

export type ProfileCompletion = {
  companyName: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  percent: number;
  filled: number;
  total: number;
  missing: Array<{ key: string; label: string }>;
};

export type NextBestAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export type ActivityItem = {
  id: string;
  eventType: string;
  description: string;
  subject: string;
  href: string;
  createdAt: string;
  actor?: { name: string; avatarUrl: string | null };
};

export type BrandDashboardData = {
  loadedAtMs: number;
  profile: Profile;
  brand: Brand | null;
  metrics: BrandDashboardMetrics;
  attention: AttentionItem[];
  activeCampaigns: ActiveCampaignCard[];
  profileCompletion: ProfileCompletion | null;
  nextActions: NextBestAction[];
  recentActivity: ActivityItem[];
  recommendedCreators: RecommendedCreator[];
};

type CampaignRow = {
  id: string;
  campaign_name: string;
  status: CampaignStatus;
  target_publish_date: string;
  budget_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: CampaignCreatorStatus;
  invited_at: string;
  updated_at: string;
  scheduled_publish_at: string | null;
};

type CampaignEventRow = {
  id: string;
  campaign_id: string;
  event_type: string;
  message: string | null;
  created_at: string;
};

type CollabEventRow = {
  id: string;
  campaign_creator_id: string;
  event_type: string;
  message: string | null;
  created_at: string;
};

function profileFieldValue(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

export function computeBrandProfileCompletion(
  brand: Brand | null,
): ProfileCompletion | null {
  if (!brand) return null;

  const fields: Array<{
    key: string;
    label: string;
    filled: boolean;
    value: string | null;
  }> = [
    {
      key: "company_name",
      label: "Company name",
      filled: profileFieldValue(brand.company_name),
      value: brand.company_name,
    },
    {
      key: "industry",
      label: "Industry",
      filled: profileFieldValue(brand.industry),
      value: brand.industry,
    },
    {
      key: "website",
      label: "Website",
      filled: profileFieldValue(brand.website),
      value: brand.website,
    },
    {
      key: "description",
      label: "Company description",
      filled: profileFieldValue(brand.description),
      value: brand.description,
    },
  ];

  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;

  return {
    companyName: brand.company_name,
    industry: brand.industry,
    website: brand.website,
    description: brand.description,
    percent: Math.round((filled / total) * 100),
    filled,
    total,
    missing: fields
      .filter((f) => !f.filled)
      .map((f) => ({ key: f.key, label: f.label })),
  };
}

function formatCampaignProgress(card: {
  totalInvitations: number;
  activeCollaborations: number;
  pendingInvites: number;
  completedCollaborations: number;
}) {
  if (card.totalInvitations === 0) {
    return "No creators invited yet";
  }
  const parts = [
    `${card.activeCollaborations} active`,
    `${card.pendingInvites} pending`,
    `${card.completedCollaborations} completed`,
  ];
  return parts.join(" · ");
}

function campaignNextStep(
  campaign: CampaignRow,
  rows: InviteRow[],
): { milestone: string; action: { label: string; href: string } } {
  const href = `/brand/campaigns/${campaign.id}`;
  const has = (s: CampaignCreatorStatus) => rows.some((r) => r.status === s);
  if (rows.length === 0) {
    return {
      milestone: "Invite creators",
      action: { label: "Invite creators", href: `/brand/discover?campaignId=${campaign.id}` },
    };
  }
  if (has("draft_submitted")) {
    const row = rows.find((r) => r.status === "draft_submitted")!;
    return {
      milestone: "Draft review",
      action: { label: "Review draft", href: `/brand/collaborations/${row.id}` },
    };
  }
  if (has("approved")) {
    const row = rows.find((r) => r.status === "approved")!;
    return {
      milestone: "Schedule publication",
      action: { label: "Set schedule", href: `/brand/collaborations/${row.id}` },
    };
  }
  if (has("published")) {
    const row = rows.find((r) => r.status === "published")!;
    return {
      milestone: "Confirm completion",
      action: { label: "Mark complete", href: `/brand/collaborations/${row.id}` },
    };
  }
  if (has("scheduled")) {
    return { milestone: "Awaiting publication", action: { label: "Open campaign", href } };
  }
  if (has("booking_pending")) {
    return { milestone: "Awaiting creator replies", action: { label: "Open campaign", href } };
  }
  if (has("accepted") || has("revision_requested")) {
    return { milestone: "Awaiting draft", action: { label: "Open campaign", href } };
  }
  return { milestone: "Wrap up campaign", action: { label: "Open campaign", href } };
}

function humanizeCollabEvent(type: string, message: string | null): string {
  switch (type) {
    case "accepted":
      return "Invitation accepted";
    case "declined":
      return "Invitation declined";
    case "invitation_withdrawn":
      return "Invitation withdrawn";
    case "draft_submitted":
      return message?.trim() || "Draft submitted";
    case "revision_requested":
      return "Revision requested";
    case "approved":
      return "Draft approved";
    case "scheduled":
      return "Publication scheduled";
    case "published":
      return "Published URL submitted";
    case "completed":
      return "Collaboration completed";
    case "cancelled":
      return "Collaboration cancelled";
    default:
      return message?.trim() || type.replaceAll("_", " ");
  }
}

function humanizeCampaignEvent(type: string, message: string | null): string {
  switch (type) {
    case "activated":
      return "Campaign activated";
    case "paused":
      return "Campaign paused";
    case "resumed":
      return "Campaign resumed";
    case "completed":
      return "Campaign completed";
    case "archived":
      return message?.trim() || "Campaign archived";
    default:
      return message?.trim() || type.replaceAll("_", " ");
  }
}

function daysUntil(isoDate: string) {
  const target = new Date(isoDate);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export async function loadBrandDashboard(
  profile: Profile,
): Promise<BrandDashboardData> {
  const loadedAtMs = Date.now();
  const supabase = await createClient();

  const [{ data: brand }, unread] = await Promise.all([
    supabase.from("brands").select("*").eq("profile_id", profile.id).maybeSingle(),
    countUnreadMessages("brand"),
  ]);

  const emptyMetrics: BrandDashboardMetrics = {
    activeCampaigns: 0,
    activeCollaborations: 0,
    draftsAwaitingReview: 0,
    completedCollaborations: 0,
    pendingInvites: 0,
    unreadMessages: unread.count,
  };

  if (!brand) {
    return {
      loadedAtMs,
      profile,
      brand: null,
      recommendedCreators: [],
      metrics: emptyMetrics,
      attention: unread.count
        ? [
            {
              id: "unread-messages",
              kind: "unread_messages",
              title: "Unread messages",
              context: `${unread.count} conversation${unread.count === 1 ? "" : "s"} need a reply`,
              statusLabel: "Inbox",
              statusTone: "info",
              href: "/brand/messages",
              actionLabel: "Open inbox",
              sortPriority: 30,
              sortAt: new Date().toISOString(),
            },
          ]
        : [],
      activeCampaigns: [],
      profileCompletion: null,
      nextActions: [
        {
          id: "explore",
          title: "Explore creators",
          description: "Browse published creator cards with fixed per-post pricing.",
          href: "/brand/discover",
          actionLabel: "Open marketplace",
        },
      ],
      recentActivity: [],
    };
  }

  const { data: campaignsData } = await supabase
    .from("campaigns")
    .select(
      "id,campaign_name,status,target_publish_date,budget_cents,currency,created_at,updated_at",
    )
    .eq("brand_id", brand.id)
    .order("updated_at", { ascending: false });

  const campaigns = (campaignsData ?? []) as CampaignRow[];
  const campaignIds = campaigns.map((c) => c.id);
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  let invites: InviteRow[] = [];
  let campaignEvents: CampaignEventRow[] = [];
  let collabEvents: CollabEventRow[] = [];
  const creatorNameById = new Map<string, string>();
  const creatorAvatarById = new Map<string, string | null>();

  if (campaignIds.length) {
    const [{ data: inviteRows }, { data: campEvents }] = await Promise.all([
      supabase
        .from("campaign_creators")
        .select(
          "id,campaign_id,creator_id,status,invited_at,updated_at,scheduled_publish_at",
        )
        .in("campaign_id", campaignIds)
        .order("updated_at", { ascending: false }),
      supabase
        .from("campaign_events")
        .select("id,campaign_id,event_type,message,created_at")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    invites = (inviteRows ?? []) as InviteRow[];
    campaignEvents = (campEvents ?? []) as CampaignEventRow[];

    const creatorIds = Array.from(new Set(invites.map((i) => i.creator_id)));
    const inviteIds = invites.map((i) => i.id);

    const [{ data: creators }, { data: collabEventRows }] = await Promise.all([
      creatorIds.length
        ? supabase
            .from("creators")
            .select("id,profiles!creators_profile_id_fkey(full_name,avatar_url)")
            .in("id", creatorIds)
        : Promise.resolve({ data: [] as unknown[] }),
      inviteIds.length
        ? supabase
            .from("collaboration_events")
            .select("id,campaign_creator_id,event_type,message,created_at")
            .in("campaign_creator_id", inviteIds)
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    type ProfileJoin = { full_name: string; avatar_url: string | null };
    for (const row of (creators ?? []) as Array<{
      id: string;
      profiles: ProfileJoin | ProfileJoin[] | null;
    }>) {
      const profileJoin = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      creatorNameById.set(row.id, profileJoin?.full_name ?? "Creator");
      creatorAvatarById.set(row.id, profileJoin?.avatar_url ?? null);
    }

    collabEvents = (collabEventRows ?? []) as CollabEventRow[];
  }

  // Published creators not yet on any of this brand's campaigns
  const invitedCreatorIds = new Set(invites.map((i) => i.creator_id));
  const { data: recommendedRows } = await supabase
    .from("creators")
    .select(
      "id,slug,headline,audience_size,price_cents,currency,topics,profiles!creators_profile_id_fkey(full_name,avatar_url)",
    )
    .eq("publication_status", "published")
    .eq("availability", "available")
    .order("audience_size", { ascending: false })
    .limit(12);

  const recommendedCreators: RecommendedCreator[] = (
    (recommendedRows ?? []) as unknown as Array<{
      id: string;
      slug: string;
      headline: string;
      audience_size: number;
      price_cents: number;
      currency: string;
      topics: string[];
      profiles:
        | { full_name: string; avatar_url: string | null }
        | { full_name: string; avatar_url: string | null }[]
        | null;
    }>
  )
    .filter((row) => !invitedCreatorIds.has(row.id))
    .slice(0, 4)
    .map((row) => {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        slug: row.slug,
        fullName: p?.full_name ?? "Creator",
        avatarUrl: p?.avatar_url ?? null,
        headline: row.headline,
        audienceSize: row.audience_size,
        priceCents: row.price_cents,
        currency: row.currency,
        topics: row.topics ?? [],
      };
    });

  const metrics: BrandDashboardMetrics = {
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    activeCollaborations: invites.filter((i) =>
      ACTIVE_COLLAB_STATUSES.includes(i.status),
    ).length,
    draftsAwaitingReview: invites.filter((i) => i.status === "draft_submitted")
      .length,
    completedCollaborations: invites.filter((i) => i.status === "completed")
      .length,
    pendingInvites: invites.filter((i) => i.status === "booking_pending").length,
    unreadMessages: unread.count,
  };

  const invitesByCampaign = new Map<string, InviteRow[]>();
  for (const invite of invites) {
    const list = invitesByCampaign.get(invite.campaign_id) ?? [];
    list.push(invite);
    invitesByCampaign.set(invite.campaign_id, list);
  }

  const attention: AttentionItem[] = [];

  for (const invite of invites) {
    const campaign = campaignById.get(invite.campaign_id);
    const creatorName = creatorNameById.get(invite.creator_id) ?? "Creator";
    const campaignName = campaign?.campaign_name ?? "Campaign";

    if (invite.status === "draft_submitted") {
      attention.push({
        id: `draft-${invite.id}`,
        kind: "draft_review",
        title: "Draft awaiting review",
        context: `${creatorName} · ${campaignName}`,
        statusLabel: "Needs review",
        statusTone: "urgent",
        href: `/brand/collaborations/${invite.id}`,
        actionLabel: "Review draft",
        sortPriority: 10,
        sortAt: invite.updated_at,
      });
    } else if (invite.status === "approved") {
      attention.push({
        id: `schedule-${invite.id}`,
        kind: "schedule",
        title: "Schedule publication",
        context: `${creatorName} · ${campaignName}`,
        statusLabel: "Ready to schedule",
        statusTone: "warning",
        href: `/brand/collaborations/${invite.id}`,
        actionLabel: "Set schedule",
        sortPriority: 15,
        sortAt: invite.updated_at,
      });
    } else if (invite.status === "published") {
      attention.push({
        id: `complete-${invite.id}`,
        kind: "complete_collab",
        title: "Mark collaboration complete",
        context: `${creatorName} · ${campaignName}`,
        statusLabel: "Published",
        statusTone: "warning",
        href: `/brand/collaborations/${invite.id}`,
        actionLabel: "Review & complete",
        sortPriority: 12,
        sortAt: invite.updated_at,
      });
    } else if (invite.status === "booking_pending") {
      attention.push({
        id: `invite-${invite.id}`,
        kind: "pending_invite",
        title: "Pending invitation",
        context: `${creatorName} · ${campaignName}`,
        statusLabel: "Awaiting creator",
        statusTone: "info",
        href: `/brand/campaigns/${invite.campaign_id}`,
        actionLabel: "View campaign",
        sortPriority: 40,
        sortAt: invite.invited_at,
      });
    }

    if (invite.scheduled_publish_at) {
      const days = daysUntil(invite.scheduled_publish_at);
      if (days >= 0 && days <= 14) {
        attention.push({
          id: `deadline-sched-${invite.id}`,
          kind: "deadline",
          title:
            days === 0
              ? "Publication scheduled for today"
              : `Publication in ${days} day${days === 1 ? "" : "s"}`,
          context: `${creatorName} · ${campaignName}`,
          statusLabel: "Upcoming",
          statusTone: days <= 3 ? "urgent" : "info",
          href: `/brand/collaborations/${invite.id}`,
          actionLabel: "Open collaboration",
          sortPriority: days <= 3 ? 18 : 35,
          sortAt: invite.scheduled_publish_at,
        });
      }
    }
  }

  for (const campaign of campaigns) {
    if (campaign.status !== "active" && campaign.status !== "paused") continue;

    const campaignInvites = invitesByCampaign.get(campaign.id) ?? [];
    const blockers = analyzeCampaignLifecycleBlockers(campaignInvites);
    // Surface only when completion is nearly possible but pending invites remain
    if (
      blockers.pendingInvitations > 0 &&
      blockers.activeCollaborations === 0
    ) {
      attention.push({
        id: `blocked-${campaign.id}`,
        kind: "blocked_complete",
        title: "Campaign completion blocked",
        context: `${campaign.campaign_name} · ${blockers.pendingInvitations} pending invite${blockers.pendingInvitations === 1 ? "" : "s"}`,
        statusLabel: CAMPAIGN_STATUS_LABEL[campaign.status],
        statusTone: "neutral",
        href: `/brand/campaigns/${campaign.id}`,
        actionLabel: "Resolve invites",
        sortPriority: 50,
        sortAt: campaign.updated_at,
      });
    }

    const days = daysUntil(campaign.target_publish_date);
    if (days >= 0 && days <= 14) {
      attention.push({
        id: `deadline-camp-${campaign.id}`,
        kind: "deadline",
        title:
          days === 0
            ? "Campaign target date is today"
            : `Target publish date in ${days} day${days === 1 ? "" : "s"}`,
        context: campaign.campaign_name,
        statusLabel: "Deadline",
        statusTone: days <= 3 ? "urgent" : "info",
        href: `/brand/campaigns/${campaign.id}`,
        actionLabel: "View campaign",
        sortPriority: days <= 3 ? 20 : 38,
        sortAt: campaign.target_publish_date,
      });
    }
  }

  if (metrics.unreadMessages > 0) {
    attention.push({
      id: "unread-messages",
      kind: "unread_messages",
      title: "Unread messages",
      context: `${metrics.unreadMessages} unread message${metrics.unreadMessages === 1 ? "" : "s"} in collaboration threads`,
      statusLabel: "Inbox",
      statusTone: "info",
      href: "/brand/messages",
      actionLabel: "Open inbox",
      sortPriority: 25,
      sortAt: new Date().toISOString(),
    });
  }

  // Dedupe by id, then sort urgent/recent first; keep a focused list
  const seenAttention = new Set<string>();
  const sortedAttention = attention
    .filter((item) => {
      if (seenAttention.has(item.id)) return false;
      seenAttention.add(item.id);
      return true;
    })
    .sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      return new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime();
    })
    .slice(0, 8);

  const activeCampaignCards: ActiveCampaignCard[] = campaigns
    .filter((c) => c.status === "active" || c.status === "paused")
    .slice(0, 3)
    .map((campaign) => {
      const rows = invitesByCampaign.get(campaign.id) ?? [];
      const counts = {
        pendingInvites: rows.filter((r) => r.status === "booking_pending")
          .length,
        activeCollaborations: rows.filter((r) =>
          (ACTIVE_CAMPAIGN_COLLAB_STATUSES as readonly string[]).includes(
            r.status,
          ),
        ).length,
        completedCollaborations: rows.filter((r) => r.status === "completed")
          .length,
        totalInvitations: rows.length,
      };
      const engaged = rows.filter(
        (r) => r.status !== "declined" && r.status !== "cancelled",
      ).length;
      const next = campaignNextStep(campaign, rows);
      const rosterSeen = new Set<string>();
      const roster: CampaignRosterCreator[] = [];
      for (const r of rows) {
        if (r.status === "declined" || r.status === "cancelled") continue;
        if (rosterSeen.has(r.creator_id)) continue;
        rosterSeen.add(r.creator_id);
        roster.push({
          id: r.creator_id,
          name: creatorNameById.get(r.creator_id) ?? "Creator",
          avatarUrl: creatorAvatarById.get(r.creator_id) ?? null,
        });
      }
      return {
        id: campaign.id,
        name: campaign.campaign_name,
        status: campaign.status,
        statusLabel: CAMPAIGN_STATUS_LABEL[campaign.status],
        targetPublishDate: campaign.target_publish_date,
        budgetCents: campaign.budget_cents,
        currency: campaign.currency,
        ...counts,
        progressLabel: formatCampaignProgress(counts),
        progressPercent: engaged
          ? Math.round((counts.completedCollaborations / engaged) * 100)
          : 0,
        roster,
        nextMilestone: next.milestone,
        nextAction: next.action,
      };
    });

  const profileCompletion = computeBrandProfileCompletion(brand);

  const attentionKinds = new Set(sortedAttention.map((a) => a.kind));
  const nextActions: NextBestAction[] = [];

  if (campaigns.length === 0) {
    nextActions.push({
      id: "first-campaign",
      title: "Create your first campaign",
      description: "Write a brief, then invite creators from the marketplace.",
      href: "/brand/campaigns/new",
      actionLabel: "Create campaign",
    });
  }

  if (
    nextActions.length < 3 &&
    !attentionKinds.has("draft_review") &&
    !attentionKinds.has("unread_messages")
  ) {
    nextActions.push({
      id: "explore",
      title: "Explore creators",
      description: "Find creators with clear pricing and audience details.",
      href: "/brand/discover",
      actionLabel: "Open marketplace",
    });
  }

  // Eligible campaign completion (active/paused, no blockers)
  if (nextActions.length < 3) {
    const eligible = campaigns.find((campaign) => {
      if (campaign.status !== "active" && campaign.status !== "paused") {
        return false;
      }
      const blockers = analyzeCampaignLifecycleBlockers(
        invitesByCampaign.get(campaign.id) ?? [],
      );
      return (
        blockers.pendingInvitations === 0 &&
        blockers.activeCollaborations === 0
      );
    });
    if (eligible && !attentionKinds.has("blocked_complete")) {
      nextActions.push({
        id: `complete-campaign-${eligible.id}`,
        title: "Complete an eligible campaign",
        description: `"${eligible.campaign_name}" has no pending invites or active collaborations.`,
        href: `/brand/campaigns/${eligible.id}`,
        actionLabel: "Open campaign",
      });
    }
  }

  if (
    nextActions.length < 3 &&
    metrics.unreadMessages > 0 &&
    !attentionKinds.has("unread_messages")
  ) {
    nextActions.push({
      id: "reply-messages",
      title: "Reply to unread messages",
      description: "Keep collaboration threads moving with a quick reply.",
      href: "/brand/messages",
      actionLabel: "Open inbox",
    });
  }

  if (nextActions.length < 3 && campaigns.some((c) => c.status === "draft")) {
    const draft = campaigns.find((c) => c.status === "draft");
    if (draft) {
      nextActions.push({
        id: `activate-${draft.id}`,
        title: "Activate a draft campaign",
        description: `"${draft.campaign_name}" is still in draft.`,
        href: `/brand/campaigns/${draft.id}`,
        actionLabel: "Open draft",
      });
    }
  }

  if (nextActions.length < 3 && campaigns.length > 0) {
    nextActions.push({
      id: "create-another",
      title: "Create another campaign",
      description: "Launch a new brief when you are ready to book more creators.",
      href: "/brand/campaigns/new",
      actionLabel: "Create campaign",
    });
  }

  if (
    nextActions.length < 3 &&
    !nextActions.some((a) => a.href === "/brand/discover")
  ) {
    nextActions.push({
      id: "explore-fallback",
      title: "Explore creators",
      description: "Browse published creator cards with fixed per-post pricing.",
      href: "/brand/discover",
      actionLabel: "Open marketplace",
    });
  }

  const attentionHrefs = new Set(
    sortedAttention
      .filter((a) =>
        [
          "draft_review",
          "schedule",
          "complete_collab",
          "unread_messages",
        ].includes(a.kind),
      )
      .map((a) => a.href),
  );
  const filteredNext = nextActions
    .filter((action) => !attentionHrefs.has(action.href))
    .slice(0, 3);

  const inviteById = new Map(invites.map((i) => [i.id, i]));

  const activity: ActivityItem[] = [];

  for (const event of campaignEvents) {
    const campaign = campaignById.get(event.campaign_id);
    if (!campaign) continue;
    activity.push({
      id: `ce-${event.id}`,
      eventType: event.event_type,
      description: humanizeCampaignEvent(event.event_type, event.message),
      subject: campaign.campaign_name,
      href: `/brand/campaigns/${campaign.id}`,
      createdAt: event.created_at,
    });
  }

  for (const event of collabEvents) {
    const invite = inviteById.get(event.campaign_creator_id);
    if (!invite) continue;
    const campaign = campaignById.get(invite.campaign_id);
    const creatorName = creatorNameById.get(invite.creator_id) ?? "Creator";
    activity.push({
      id: `cle-${event.id}`,
      eventType: event.event_type,
      description: humanizeCollabEvent(event.event_type, event.message),
      subject: campaign?.campaign_name ?? "Campaign",
      href: `/brand/collaborations/${invite.id}`,
      createdAt: event.created_at,
      actor: {
        name: creatorName,
        avatarUrl: creatorAvatarById.get(invite.creator_id) ?? null,
      },
    });
  }

  // Real invitation timestamps (no fabricated events)
  for (const invite of invites) {
    if (!invite.invited_at) continue;
    const campaign = campaignById.get(invite.campaign_id);
    const creatorName = creatorNameById.get(invite.creator_id) ?? "Creator";
    activity.push({
      id: `inv-${invite.id}`,
      eventType: "invitation_sent",
      description: "Invitation sent",
      subject: campaign?.campaign_name ?? "Campaign",
      href: `/brand/campaigns/${invite.campaign_id}`,
      createdAt: invite.invited_at,
      actor: {
        name: creatorName,
        avatarUrl: creatorAvatarById.get(invite.creator_id) ?? null,
      },
    });
  }

  const recentActivity = activity
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  return {
    loadedAtMs,
    profile,
    brand,
    metrics,
    attention: sortedAttention,
    activeCampaigns: activeCampaignCards,
    profileCompletion,
    nextActions: filteredNext,
    recentActivity,
    recommendedCreators,
  };
}
