import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";
import { STATUS_LABEL } from "@/lib/collaborations/status";
import { initials } from "@/components/workspace/ui";

export function ParticipantAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ${sizeClass}`}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

export function CollaborationStatusBadge({
  status,
}: {
  status: CampaignCreatorStatus;
}) {
  const tone =
    status === "completed"
      ? "bg-success-soft text-success"
      : status === "cancelled" || status === "declined"
        ? "bg-danger-soft text-danger"
        : status === "revision_requested" || status === "draft_submitted"
          ? "bg-warning-soft text-warning"
          : "bg-accent-soft text-accent";

  return (
    <span
      className={`inline-flex items-center rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDateSeparator(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfMsg.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
