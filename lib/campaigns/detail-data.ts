import {
  ACTIVE_CAMPAIGN_COLLAB_STATUSES,
  analyzeCampaignLifecycleBlockers,
  availableCampaignActions,
  type CampaignLifecycleAction,
} from "@/lib/campaigns/status";
import { computeCampaignStats } from "@/lib/campaigns/list-data";
import type {
  Campaign,
  CampaignCreatorStatus,
  CampaignStatus,
} from "@/lib/supabase/database.types";
import { STATUS_LABEL } from "@/lib/collaborations/status";
import { nextActionForStatus } from "@/lib/collaborations/status";

export type CampaignDetailInvitation = {
  id: string;
  status: CampaignCreatorStatus;
  creator_id: string;
  price_cents: number;
  currency: string;
  post_count_snapshot: number;
  decline_reason: string | null;
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  scheduled_publish_at: string | null;
  creator: {
    id: string;
    slug: string;
    headline: string;
    full_name: string;
  } | null;
  unread: boolean;
};

export type CampaignDetailActivityItem = {
  id: string;
  eventType: string;
  description: string;
  actorName: string | null;
  creatorName: string | null;
  href: string | null;
  createdAt: string;
};

export type CampaignDetailPrimaryAction = {
  kind: "link" | "lifecycle";
  label: string;
  href?: string;
  action?: CampaignLifecycleAction;
  requiresConfirm?: boolean;
};

export type CampaignDetailTab =
  | "overview"
  | "creators"
  | "collaborations"
  | "activity";

export function invitationDisplayLabel(inv: {
  status: CampaignCreatorStatus;
  accepted_at: string | null;
}): string {
  if (inv.status === "cancelled" && !inv.accepted_at) {
    return "Withdrawn";
  }
  return STATUS_LABEL[inv.status];
}

export function collaborationTabInvites(
  invitations: CampaignDetailInvitation[],
): CampaignDetailInvitation[] {
  return invitations.filter((inv) => {
    if (
      (ACTIVE_CAMPAIGN_COLLAB_STATUSES as readonly string[]).includes(inv.status) ||
      inv.status === "completed"
    ) {
      return true;
    }
    // Cancelled after acceptance (collab cancelled)
    if (inv.status === "cancelled" && inv.accepted_at) return true;
    return false;
  });
}

export function humanizeCampaignEvent(
  type: string,
  message: string | null,
): string {
  switch (type) {
    case "created":
      return "Campaign created";
    case "updated":
    case "edited":
      return message?.trim() || "Campaign brief updated";
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

export function humanizeCollabEvent(
  type: string,
  message: string | null,
): string {
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

export function getCampaignDetailPrimaryAction({
  campaign,
  invitations,
}: {
  campaign: Pick<Campaign, "id" | "status">;
  invitations: Array<{
    id: string;
    status: string;
    price_cents: number;
    post_count_snapshot: number;
  }>;
}): CampaignDetailPrimaryAction | null {
  const status = campaign.status as CampaignStatus;
  const stats = computeCampaignStats(invitations);
  const blockers = analyzeCampaignLifecycleBlockers(invitations);
  const lifecycle = availableCampaignActions(status, blockers);
  const draftReview = invitations.find((i) => i.status === "draft_submitted");
  const published = invitations.find((i) => i.status === "published");

  if (draftReview) {
    return {
      kind: "link",
      label: stats.draftsAwaitingReview > 1 ? "Review drafts" : "Review draft",
      href: `/brand/collaborations/${draftReview.id}`,
    };
  }

  if (published) {
    return {
      kind: "link",
      label: "Mark complete",
      href: `/brand/collaborations/${published.id}`,
    };
  }

  if (status === "draft") {
    if (stats.invited === 0) {
      return {
        kind: "link",
        label: "Invite creators",
        href: `/brand/discover?campaignId=${campaign.id}`,
      };
    }
    return {
      kind: "link",
      label: "Edit draft",
      href: `/brand/campaigns/${campaign.id}?tab=overview`,
    };
  }

  if (status === "paused") {
    const resume = lifecycle.find((a) => a.action === "resume" && a.enabled);
    if (resume) {
      return {
        kind: "lifecycle",
        label: "Resume campaign",
        action: "resume",
        requiresConfirm: resume.requiresConfirm,
      };
    }
  }

  if (status === "active" && stats.invited === 0) {
    return {
      kind: "link",
      label: "Invite creators",
      href: `/brand/discover?campaignId=${campaign.id}`,
    };
  }

  if (status === "active" && stats.pending > 0 && stats.active === 0) {
    return {
      kind: "link",
      label: "Invite creators",
      href: `/brand/discover?campaignId=${campaign.id}`,
    };
  }

  if (status === "active" || status === "paused") {
    const complete = lifecycle.find((a) => a.action === "complete");
    if (complete?.enabled) {
      return {
        kind: "lifecycle",
        label: "Complete campaign",
        action: "complete",
        requiresConfirm: true,
      };
    }
    if (status === "active") {
      return {
        kind: "link",
        label: "Invite creators",
        href: `/brand/discover?campaignId=${campaign.id}`,
      };
    }
  }

  if (status === "completed") {
    const archive = lifecycle.find((a) => a.action === "archive" && a.enabled);
    if (archive) {
      return {
        kind: "lifecycle",
        label: "Archive campaign",
        action: "archive",
        requiresConfirm: true,
      };
    }
  }

  return null;
}

export function brandNextActionForInvite(status: CampaignCreatorStatus): string {
  return nextActionForStatus(status, "brand");
}

export function buildCampaignActivity({
  campaign,
  invitations,
  campaignEvents,
  collabEvents,
  actorNames,
}: {
  campaign: Pick<Campaign, "id" | "created_at" | "campaign_name">;
  invitations: CampaignDetailInvitation[];
  campaignEvents: Array<{
    id: string;
    event_type: string;
    message: string | null;
    actor_profile_id: string | null;
    created_at: string;
  }>;
  collabEvents: Array<{
    id: string;
    campaign_creator_id: string;
    event_type: string;
    message: string | null;
    actor_profile_id: string | null;
    created_at: string;
  }>;
  actorNames: Map<string, string>;
}): CampaignDetailActivityItem[] {
  const inviteById = new Map(invitations.map((i) => [i.id, i]));
  const items: CampaignDetailActivityItem[] = [];

  items.push({
    id: `created-${campaign.id}`,
    eventType: "created",
    description: humanizeCampaignEvent("created", null),
    actorName: null,
    creatorName: null,
    href: null,
    createdAt: campaign.created_at,
  });

  for (const event of campaignEvents) {
    items.push({
      id: `ce-${event.id}`,
      eventType: event.event_type,
      description: humanizeCampaignEvent(event.event_type, event.message),
      actorName: event.actor_profile_id
        ? (actorNames.get(event.actor_profile_id) ?? null)
        : null,
      creatorName: null,
      href: null,
      createdAt: event.created_at,
    });
  }

  for (const event of collabEvents) {
    const invite = inviteById.get(event.campaign_creator_id);
    items.push({
      id: `cle-${event.id}`,
      eventType: event.event_type,
      description: humanizeCollabEvent(event.event_type, event.message),
      actorName: event.actor_profile_id
        ? (actorNames.get(event.actor_profile_id) ?? null)
        : null,
      creatorName: invite?.creator?.full_name ?? null,
      href: invite ? `/brand/collaborations/${invite.id}` : null,
      createdAt: event.created_at,
    });
  }

  for (const invite of invitations) {
    if (!invite.invited_at) continue;
    items.push({
      id: `inv-${invite.id}`,
      eventType: "invitation_sent",
      description: "Invitation sent",
      actorName: null,
      creatorName: invite.creator?.full_name ?? null,
      href: `/brand/campaigns/${campaign.id}?tab=creators`,
      createdAt: invite.invited_at,
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
