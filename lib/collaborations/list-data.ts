import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";
import {
  ACTIVE_COLLAB_STATUSES,
  STATUS_LABEL,
  collaborationUrgencyScore,
  isAwaitingOtherParty,
  needsAttentionStatuses,
  nextActionForStatus,
  primaryActionForCollaboration,
} from "@/lib/collaborations/status";

export type CollaborationListRole = "brand" | "creator";

export type CollaborationListItem = {
  id: string;
  status: CampaignCreatorStatus;
  price_cents: number;
  currency: string;
  post_count_snapshot: number;
  updated_at: string;
  scheduled_publish_at: string | null;
  published_url: string | null;
  campaignId: string | null;
  campaignName: string;
  deliverableType: string;
  targetPublishDate: string | null;
  participantName: string;
  participantMeta: string | null;
  unread: boolean;
  role: CollaborationListRole;
};

export type CollabTab =
  | "needs_attention"
  | "active"
  | "awaiting"
  | "completed"
  | "cancelled";

export type CollabSort = "urgency" | "updated" | "target";
export type DeadlineFilter = "all" | "upcoming" | "overdue";

export function detailHref(role: CollaborationListRole, id: string) {
  return role === "brand"
    ? `/brand/collaborations/${id}`
    : `/creator/collaborations/${id}`;
}

export function messagesHref(role: CollaborationListRole, id: string) {
  return role === "brand"
    ? `/brand/messages/${id}`
    : `/creator/messages/${id}`;
}

export function targetOrScheduledMs(item: CollaborationListItem): number | null {
  const iso = item.scheduled_publish_at ?? item.targetPublishDate;
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isDeadlineOverdue(item: CollaborationListItem, nowMs: number) {
  if (item.status === "completed" || item.status === "cancelled") return false;
  const ms = targetOrScheduledMs(item);
  return ms != null && ms < nowMs;
}

export function isDeadlineUpcoming(item: CollaborationListItem, nowMs: number) {
  if (item.status === "completed" || item.status === "cancelled") return false;
  const ms = targetOrScheduledMs(item);
  if (ms == null) return false;
  const days = (ms - nowMs) / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= 30;
}

export function itemNeedsAttention(item: CollaborationListItem) {
  return needsAttentionStatuses(item.role).includes(item.status);
}

export function itemIsActive(item: CollaborationListItem) {
  return ACTIVE_COLLAB_STATUSES.includes(item.status);
}

export function itemAwaitsOther(item: CollaborationListItem) {
  return (
    itemIsActive(item) && isAwaitingOtherParty(item.status, item.role)
  );
}

export function computeCollabCounts(items: CollaborationListItem[]) {
  let needsAttention = 0;
  let active = 0;
  let awaiting = 0;
  let completed = 0;
  let cancelled = 0;

  for (const item of items) {
    if (item.status === "completed") completed += 1;
    else if (item.status === "cancelled") cancelled += 1;
    if (itemIsActive(item)) {
      active += 1;
      if (itemNeedsAttention(item)) needsAttention += 1;
      if (itemAwaitsOther(item)) awaiting += 1;
    }
  }

  return { needsAttention, active, awaiting, completed, cancelled };
}

export function matchesTab(item: CollaborationListItem, tab: CollabTab) {
  switch (tab) {
    case "needs_attention":
      return itemNeedsAttention(item);
    case "active":
      return itemIsActive(item);
    case "awaiting":
      return itemAwaitsOther(item);
    case "completed":
      return item.status === "completed";
    case "cancelled":
      return item.status === "cancelled";
    default:
      return true;
  }
}

export function urgencyBorderTone(
  item: CollaborationListItem,
  nowMs: number,
): "warning" | "accent" | "none" {
  if (!itemIsActive(item)) return "none";
  if (item.status === "revision_requested") return "warning";
  if (itemNeedsAttention(item)) {
    if (isDeadlineOverdue(item, nowMs)) return "warning";
    return "accent";
  }
  if (isDeadlineOverdue(item, nowMs)) return "warning";
  return "none";
}

export function latestWorkflowUpdate(item: CollaborationListItem) {
  return STATUS_LABEL[item.status];
}

export function nextActionLabel(item: CollaborationListItem) {
  return nextActionForStatus(item.status, item.role);
}

export function primaryAction(item: CollaborationListItem) {
  return primaryActionForCollaboration(
    item.status,
    item.role,
    detailHref(item.role, item.id),
    messagesHref(item.role, item.id),
  );
}

export function sortCollaborations(
  items: CollaborationListItem[],
  sort: CollabSort,
  nowMs: number,
) {
  const list = [...items];
  if (sort === "target") {
    list.sort((a, b) => {
      const am = targetOrScheduledMs(a) ?? Number.POSITIVE_INFINITY;
      const bm = targetOrScheduledMs(b) ?? Number.POSITIVE_INFINITY;
      return am - bm;
    });
    return list;
  }
  if (sort === "updated") {
    list.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    return list;
  }
  list.sort((a, b) => {
    const as = collaborationUrgencyScore({
      status: a.status,
      role: a.role,
      targetOrScheduledMs: targetOrScheduledMs(a),
      updatedAtMs: new Date(a.updated_at).getTime(),
      nowMs,
      unread: a.unread,
    });
    const bs = collaborationUrgencyScore({
      status: b.status,
      role: b.role,
      targetOrScheduledMs: targetOrScheduledMs(b),
      updatedAtMs: new Date(b.updated_at).getTime(),
      nowMs,
      unread: b.unread,
    });
    return bs - as;
  });
  return list;
}

export function filterCollaborations({
  items,
  tab,
  q,
  campaignId,
  status,
  deadline,
  sort,
  nowMs,
}: {
  items: CollaborationListItem[];
  tab: CollabTab;
  q: string;
  campaignId: string;
  status: CampaignCreatorStatus | "all";
  deadline: DeadlineFilter;
  sort: CollabSort;
  nowMs: number;
}) {
  let list = items.filter((item) => matchesTab(item, tab));

  const needle = q.trim().toLowerCase();
  if (needle) {
    list = list.filter((item) =>
      [item.campaignName, item.participantName, item.deliverableType]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }

  if (campaignId) {
    list = list.filter((item) => item.campaignId === campaignId);
  }

  if (status !== "all") {
    list = list.filter((item) => item.status === status);
  }

  if (deadline === "upcoming") {
    list = list.filter((item) => isDeadlineUpcoming(item, nowMs));
  } else if (deadline === "overdue") {
    list = list.filter((item) => isDeadlineOverdue(item, nowMs));
  }

  return sortCollaborations(list, sort, nowMs);
}
