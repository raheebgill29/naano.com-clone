import type {
  CampaignCreatorStatus,
  ContentSubmission,
} from "@/lib/supabase/database.types";
import {
  isAwaitingOtherParty,
  needsAttentionStatuses,
  nextActionForStatus,
} from "@/lib/collaborations/status";

export function humanizeCollaborationEvent(
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
      return message?.trim() || "Revision requested";
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

export function draftReviewLabel(
  reviewStatus: ContentSubmission["review_status"],
): string | null {
  switch (reviewStatus) {
    case "pending":
      return "Pending review";
    case "revision_requested":
      return "Changes requested";
    case "approved":
      return "Approved";
    default:
      return null;
  }
}

export function draftReviewBadgeClass(
  reviewStatus: ContentSubmission["review_status"],
): string {
  switch (reviewStatus) {
    case "pending":
      return "bg-warning-soft text-warning";
    case "revision_requested":
      return "bg-warning-soft text-warning";
    case "approved":
      return "bg-success-soft text-success";
    default:
      return "bg-page text-support";
  }
}

export type DetailPrimaryKind =
  | "scroll-action"
  | "messages"
  | "none";

export function detailPrimaryAction(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
): {
  kind: DetailPrimaryKind;
  label: string;
  waitingLabel?: string;
} {
  const waiting = isAwaitingOtherParty(status, role);
  if (waiting) {
    return {
      kind: "messages",
      label: "Open conversation",
      waitingLabel:
        role === "brand" ? "Waiting on creator" : "Waiting on brand",
    };
  }

  if (role === "brand") {
    switch (status) {
      case "draft_submitted":
        return { kind: "scroll-action", label: "Review draft" };
      case "approved":
        return { kind: "scroll-action", label: "Schedule post" };
      case "published":
        return { kind: "scroll-action", label: "Mark complete" };
      case "completed":
      case "cancelled":
        return { kind: "none", label: "View collaboration" };
      default:
        return { kind: "messages", label: "Open conversation" };
    }
  }

  switch (status) {
    case "accepted":
      return { kind: "scroll-action", label: "Submit draft" };
    case "revision_requested":
      return { kind: "scroll-action", label: "Respond to revisions" };
    case "scheduled":
      return { kind: "scroll-action", label: "Add published URL" };
    case "completed":
    case "cancelled":
      return { kind: "none", label: "View collaboration" };
    default:
      return { kind: "messages", label: "Open conversation" };
  }
}

export function roleOwnsAction(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
): boolean {
  return needsAttentionStatuses(role).includes(status);
}

export function actionPanelTitle(
  status: CampaignCreatorStatus,
  role: "brand" | "creator",
): string {
  if (isAwaitingOtherParty(status, role)) {
    return role === "brand" ? "Waiting on creator" : "Waiting on brand";
  }
  return nextActionForStatus(status, role);
}
