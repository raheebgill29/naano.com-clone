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
