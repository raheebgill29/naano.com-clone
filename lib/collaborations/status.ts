import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

export const ACTIVE_COLLAB_STATUSES: CampaignCreatorStatus[] = [
  "accepted",
  "draft_submitted",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
];

export const STATUS_LABEL: Record<CampaignCreatorStatus, string> = {
  booking_pending: "Pending invite",
  accepted: "Accepted",
  draft_submitted: "Draft submitted",
  revision_requested: "Revision requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function collaborationStatusBadgeClass(
  status: CampaignCreatorStatus,
): string {
  switch (status) {
    case "completed":
      return "bg-success-soft text-success";
    case "cancelled":
    case "declined":
      return "bg-danger-soft text-danger";
    case "revision_requested":
    case "draft_submitted":
      return "bg-warning-soft text-warning";
    case "published":
    case "approved":
    case "scheduled":
      return "bg-accent-soft text-accent";
    default:
      return "bg-page text-support";
  }
}

export function nextActionForStatus(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
): string {
  if (role === "creator") {
    switch (status) {
      case "accepted":
        return "Submit your draft content.";
      case "revision_requested":
        return "Revise and resubmit your draft.";
      case "draft_submitted":
        return "Waiting for brand review.";
      case "approved":
        return "Waiting for the brand to schedule publication.";
      case "scheduled":
        return "Publish on LinkedIn, then submit the post URL.";
      case "published":
        return "Waiting for the brand to mark this complete.";
      case "completed":
        return "Collaboration complete.";
      case "cancelled":
        return "This collaboration was cancelled.";
      default:
        return "No action required.";
    }
  }

  switch (status) {
    case "accepted":
      return "Waiting for the creator to submit a draft.";
    case "draft_submitted":
      return "Review the latest draft — approve or request revisions.";
    case "revision_requested":
      return "Waiting for the creator to resubmit.";
    case "approved":
      return "Set the scheduled publication date.";
    case "scheduled":
      return "Waiting for the creator to submit the published LinkedIn URL.";
    case "published":
      return "Confirm the live post and mark complete.";
    case "completed":
      return "Collaboration complete.";
    case "cancelled":
      return "This collaboration was cancelled.";
    default:
      return "No action required.";
  }
}

/** Statuses where the current role must act. */
export function needsAttentionStatuses(
  role: "brand" | "creator",
): CampaignCreatorStatus[] {
  return role === "brand"
    ? ["draft_submitted", "approved", "published"]
    : ["accepted", "revision_requested", "scheduled"];
}

export function isAwaitingOtherParty(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
): boolean {
  if (role === "brand") {
    return (
      status === "accepted" ||
      status === "revision_requested" ||
      status === "scheduled"
    );
  }
  return (
    status === "draft_submitted" ||
    status === "approved" ||
    status === "published"
  );
}

export type CollabPrimaryAction = {
  label: string;
  href: string;
  waitingLabel?: string;
};

export function primaryActionForCollaboration(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
  detailHref: string,
  messagesHref: string,
): CollabPrimaryAction {
  if (role === "brand") {
    switch (status) {
      case "draft_submitted":
        return { label: "Review draft", href: detailHref };
      case "approved":
        return { label: "Schedule post", href: detailHref };
      case "published":
        return { label: "Mark complete", href: detailHref };
      case "accepted":
      case "revision_requested":
      case "scheduled":
        return {
          label: "Open conversation",
          href: messagesHref,
          waitingLabel: "Waiting on creator",
        };
      default:
        return { label: "View collaboration", href: detailHref };
    }
  }

  switch (status) {
    case "accepted":
      return { label: "Submit draft", href: detailHref };
    case "revision_requested":
      return { label: "Respond to revisions", href: detailHref };
    case "scheduled":
      return { label: "Add published URL", href: detailHref };
    case "draft_submitted":
    case "approved":
    case "published":
      return {
        label: "Open conversation",
        href: messagesHref,
        waitingLabel: "Waiting on brand",
      };
    default:
      return { label: "View collaboration", href: detailHref };
  }
}

export const WORKFLOW_STAGES = [
  { id: "accepted", label: "Accepted" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "completed", label: "Completed" },
] as const;

/** Highest completed stage index (0-based). -1 if cancelled / not started. */
export function workflowStageIndex(status: CampaignCreatorStatus): number {
  switch (status) {
    case "accepted":
      return 0;
    case "draft_submitted":
      return 2; // past draft, at review
    case "revision_requested":
      return 1; // back at draft with revision flag
    case "approved":
      return 3;
    case "scheduled":
      return 4;
    case "published":
      return 5;
    case "completed":
      return 6;
    case "cancelled":
    case "declined":
    case "booking_pending":
    default:
      return -1;
  }
}

export function isRevisionLoop(status: CampaignCreatorStatus): boolean {
  return status === "revision_requested";
}

/**
 * Urgency score: higher = more urgent. Pure function using provided nowMs.
 */
export function collaborationUrgencyScore({
  status,
  role,
  targetOrScheduledMs,
  updatedAtMs,
  nowMs,
  unread,
}: {
  status: CampaignCreatorStatus;
  role: "brand" | "creator";
  targetOrScheduledMs: number | null;
  updatedAtMs: number;
  nowMs: number;
  unread: boolean;
}): number {
  let score = 0;
  const attention = needsAttentionStatuses(role).includes(status);
  if (attention) score += 100;
  if (status === "revision_requested") score += 40;
  if (status === "draft_submitted" && role === "brand") score += 30;
  if (status === "published" && role === "brand") score += 25;
  if (unread) score += 15;

  if (targetOrScheduledMs != null) {
    const days = (targetOrScheduledMs - nowMs) / (24 * 60 * 60 * 1000);
    if (days < 0 && attention) score += 50;
    else if (days >= 0 && days <= 3 && attention) score += 35;
    else if (days >= 0 && days <= 7) score += 10;
  }

  // Prefer recently updated when otherwise equal
  score += Math.max(0, 5 - (nowMs - updatedAtMs) / (24 * 60 * 60 * 1000));
  return score;
}
