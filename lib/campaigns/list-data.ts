import {
  ACTIVE_CAMPAIGN_COLLAB_STATUSES,
  analyzeCampaignLifecycleBlockers,
  availableCampaignActions,
  type CampaignLifecycleAction,
} from "@/lib/campaigns/status";
import type {
  CampaignCreatorStatus,
  CampaignStatus,
} from "@/lib/supabase/database.types";

export type CampaignListStats = {
  invited: number;
  pending: number;
  active: number;
  draftsAwaitingReview: number;
  completed: number;
  declinedOrCancelled: number;
  committedCents: number;
};

export type CampaignListItem = {
  id: string;
  campaign_name: string;
  status: CampaignStatus;
  product_or_company: string;
  objective: string;
  budget_cents: number;
  currency: string;
  post_count: number;
  target_publish_date: string;
  created_at: string;
  updated_at: string;
  stats: CampaignListStats;
  invitationStatuses: Array<{ id: string; status: string }>;
  isOverdue: boolean;
  isUpcoming30d: boolean;
};

export type CampaignNextAction = {
  kind: "link" | "lifecycle";
  label: string;
  href?: string;
  action?: CampaignLifecycleAction;
  requiresConfirm?: boolean;
};

const COST_STATUSES: CampaignCreatorStatus[] = [
  "accepted",
  "draft_submitted",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
  "completed",
];

export function computeCampaignStats(
  invitations: Array<{
    id: string;
    status: string;
    price_cents: number;
    post_count_snapshot: number;
  }>,
): CampaignListStats {
  let pending = 0;
  let active = 0;
  let draftsAwaitingReview = 0;
  let completed = 0;
  let declinedOrCancelled = 0;
  let committedCents = 0;

  for (const inv of invitations) {
    if (inv.status === "booking_pending") pending += 1;
    else if (
      (ACTIVE_CAMPAIGN_COLLAB_STATUSES as readonly string[]).includes(inv.status)
    ) {
      active += 1;
      if (inv.status === "draft_submitted") draftsAwaitingReview += 1;
    } else if (inv.status === "completed") completed += 1;
    else if (inv.status === "declined" || inv.status === "cancelled") {
      declinedOrCancelled += 1;
    }

    if ((COST_STATUSES as string[]).includes(inv.status)) {
      committedCents += inv.price_cents * (inv.post_count_snapshot || 1);
    }
  }

  return {
    invited: invitations.length,
    pending,
    active,
    draftsAwaitingReview,
    completed,
    declinedOrCancelled,
    committedCents,
  };
}

export function getCampaignNextAction(
  item: CampaignListItem,
): CampaignNextAction | null {
  const { status, stats, id } = item;
  const blockers = analyzeCampaignLifecycleBlockers(item.invitationStatuses);
  const lifecycle = availableCampaignActions(status, blockers);

  if (stats.draftsAwaitingReview > 0) {
    return {
      kind: "link",
      label:
        stats.draftsAwaitingReview === 1
          ? "Review draft"
          : `Review ${stats.draftsAwaitingReview} drafts`,
      href: `/brand/collaborations?filter=needs_review`,
    };
  }

  if (status === "draft") {
    if (stats.invited === 0) {
      return {
        kind: "link",
        label: "Invite creators",
        href: `/brand/campaigns/${id}`,
      };
    }
    return {
      kind: "link",
      label: "Edit draft",
      href: `/brand/campaigns/${id}`,
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
      href: `/brand/campaigns/${id}`,
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
  }

  if (status === "completed") {
    return {
      kind: "lifecycle",
      label: "Archive",
      action: "archive",
      requiresConfirm: true,
    };
  }

  return null;
}

export function campaignNeedsAttention(item: CampaignListItem): boolean {
  if (item.stats.draftsAwaitingReview > 0) return true;
  if (item.status === "paused") return true;
  if (item.status === "active" && item.isOverdue) return true;
  return false;
}

export function campaignProgressPercent(stats: CampaignListStats): number | null {
  const total = stats.active + stats.completed + stats.pending;
  if (total <= 0) return null;
  return Math.round((stats.completed / total) * 100);
}
