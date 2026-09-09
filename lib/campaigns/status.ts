import type { CampaignStatus } from "@/lib/supabase/database.types";

/** Collaborations still in delivery — block complete/archive. */
export const ACTIVE_CAMPAIGN_COLLAB_STATUSES = [
  "accepted",
  "draft_submitted",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
] as const;

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const CAMPAIGN_STATUS_EXPLANATION: Record<CampaignStatus, string> = {
  draft: "This campaign brief is still being prepared.",
  active: "This campaign is live and can invite creators.",
  paused:
    "New invitations are paused. Existing invitations and collaborations continue.",
  completed: "This campaign is finished and read-only.",
  archived: "This campaign is archived and kept for history.",
};

export function campaignStatusBadgeClass(status: CampaignStatus): string {
  switch (status) {
    case "active":
      return "bg-success-soft text-success";
    case "paused":
      return "bg-warning-soft text-warning";
    case "completed":
      return "bg-accent-soft text-accent";
    case "archived":
      return "bg-page text-support";
    case "draft":
    default:
      return "bg-page text-support";
  }
}

export type CampaignLifecycleAction =
  | "activate"
  | "pause"
  | "resume"
  | "complete"
  | "archive";

export const CAMPAIGN_ACTION_LABEL: Record<CampaignLifecycleAction, string> = {
  activate: "Activate",
  pause: "Pause",
  resume: "Resume",
  complete: "Mark complete",
  archive: "Archive",
};

export function campaignsAcceptInvites(status: CampaignStatus): boolean {
  return status === "draft" || status === "active";
}

export function campaignIsReadOnly(status: CampaignStatus): boolean {
  return status === "completed" || status === "archived";
}

export type CampaignLifecycleBlockers = {
  pendingInvitations: number;
  activeCollaborations: number;
  pendingInviteIds: string[];
  activeCollabIds: string[];
};

export function analyzeCampaignLifecycleBlockers(
  invitations: Array<{ id: string; status: string }>,
): CampaignLifecycleBlockers {
  const pending = invitations.filter((i) => i.status === "booking_pending");
  const active = invitations.filter((i) =>
    (ACTIVE_CAMPAIGN_COLLAB_STATUSES as readonly string[]).includes(i.status),
  );
  return {
    pendingInvitations: pending.length,
    activeCollaborations: active.length,
    pendingInviteIds: pending.map((i) => i.id),
    activeCollabIds: active.map((i) => i.id),
  };
}

export function availableCampaignActions(
  status: CampaignStatus,
  blockers: CampaignLifecycleBlockers,
): Array<{
  action: CampaignLifecycleAction;
  enabled: boolean;
  reason?: string;
  requiresConfirm: boolean;
}> {
  const completeBlocked =
    blockers.pendingInvitations > 0 || blockers.activeCollaborations > 0;
  const completeReason = completeBlocked
    ? [
        blockers.pendingInvitations > 0
          ? `${blockers.pendingInvitations} pending invitation${blockers.pendingInvitations === 1 ? "" : "s"}`
          : null,
        blockers.activeCollaborations > 0
          ? `${blockers.activeCollaborations} active collaboration${blockers.activeCollaborations === 1 ? "" : "s"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  switch (status) {
    case "draft":
      return [
        {
          action: "activate",
          enabled: true,
          requiresConfirm: false,
        },
        {
          action: "archive",
          enabled: blockers.activeCollaborations === 0,
          reason:
            blockers.activeCollaborations > 0
              ? "Active collaborations must finish before archiving."
              : undefined,
          requiresConfirm: true,
        },
      ];
    case "active":
      return [
        {
          action: "pause",
          enabled: true,
          requiresConfirm: false,
        },
        {
          action: "complete",
          enabled: !completeBlocked,
          reason: completeReason
            ? `Resolve before completing: ${completeReason}`
            : undefined,
          requiresConfirm: true,
        },
      ];
    case "paused":
      return [
        {
          action: "resume",
          enabled: true,
          requiresConfirm: false,
        },
        {
          action: "complete",
          enabled: !completeBlocked,
          reason: completeReason
            ? `Resolve before completing: ${completeReason}`
            : undefined,
          requiresConfirm: true,
        },
      ];
    case "completed":
      return [
        {
          action: "archive",
          enabled: true,
          requiresConfirm: true,
        },
      ];
    case "archived":
    default:
      return [];
  }
}
