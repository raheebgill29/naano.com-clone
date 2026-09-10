"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { CollaborationWorkflowProgress } from "@/components/collaborations/workflow-progress";
import { ParticipantAvatar } from "@/components/messages/ui";
import { formatPriceCents } from "@/components/workspace/ui";
import {
  detailHref,
  isDeadlineOverdue,
  isDeadlineUpcoming,
  itemNeedsAttention,
  latestWorkflowUpdate,
  messagesHref,
  nextActionLabel,
  primaryAction,
  targetOrScheduledMs,
  type CollaborationListItem,
} from "@/lib/collaborations/list-data";
import {
  STATUS_LABEL,
  collaborationStatusBadgeClass,
} from "@/lib/collaborations/status";

function relativeUpdated(iso: string, nowMs: number) {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 48) return rtf.format(hr, "hour");
  const day = Math.round(hr / 24);
  return rtf.format(day, "day");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const COLLAB_TABLE_COLUMNS =
  "lg:grid-cols-[minmax(0,3.6fr)_minmax(0,3.2fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,2.2fr)]";

export function CollaborationListRow({
  item,
  nowMs,
}: {
  item: CollaborationListItem;
  nowMs: number;
}) {
  const href = detailHref(item.role, item.id);
  const chatHref = messagesHref(item.role, item.id);
  const action = primaryAction(item);
  const attention = itemNeedsAttention(item);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dateMs = targetOrScheduledMs(item);
  const dateLabel = item.scheduled_publish_at
    ? "Scheduled"
    : item.targetPublishDate
      ? "Target"
      : null;
  const overdue = isDeadlineOverdue(item, nowMs);
  const upcoming = isDeadlineUpcoming(item, nowMs);
  const compensation = formatPriceCents(
    item.price_cents * item.post_count_snapshot,
    item.currency,
  );
  const owner = action.waitingLabel
    ? action.waitingLabel
    : attention
      ? "You"
      : item.status === "completed"
        ? "Done"
        : item.status === "cancelled" || item.status === "declined"
          ? "—"
          : "You";
  const closed =
    item.status === "completed" ||
    item.status === "cancelled" ||
    item.status === "declined";

  return (
    <article
      className={`grid gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-page/40 lg:items-center ${COLLAB_TABLE_COLUMNS} ${
        closed ? "text-ink-muted" : ""
      }`}
    >
      {/* Participant + campaign */}
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className={`mt-3 h-1.5 w-1.5 shrink-0 rounded-full ${
            attention ? "bg-accent" : "bg-transparent"
          }`}
        />
        <ParticipantAvatar name={item.participantName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={href}
              className={`display truncate text-[1.2rem] leading-tight hover:text-accent ${
                closed ? "text-ink-muted" : "text-ink"
              }`}
            >
              {item.participantName}
            </Link>
            {item.unread ? (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" title="Unread messages" aria-label="Unread messages" />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-support">
            {item.campaignName}
            {item.participantMeta ? ` · ${item.participantMeta}` : null}
          </p>
          <button
            type="button"
            className="mt-1 text-[12px] font-semibold text-ink-muted hover:text-ink lg:hidden"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Hide details" : "Details"}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className={`min-w-0 ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(item.status)}`}
          >
            {STATUS_LABEL[item.status]}
          </span>
          {overdue ? (
            <span className="text-[11px] font-semibold text-warning">Overdue</span>
          ) : upcoming && attention ? (
            <span className="text-[11px] font-semibold text-support">Due soon</span>
          ) : null}
        </div>
        <div className="mt-1.5">
          <CollaborationWorkflowProgress status={item.status} />
        </div>
      </div>

      {/* Owner of next action */}
      <div className={`text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className={`font-semibold ${attention ? "text-accent" : "text-ink"}`}>
          {owner}
        </p>
        <p className="mt-0.5 line-clamp-2 leading-4 text-support">
          {nextActionLabel(item)}
        </p>
      </div>

      {/* Deliverable + compensation + date */}
      <div className={`tnum text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className="truncate font-semibold text-ink">{item.deliverableType}</p>
        <p className="text-support">{compensation}</p>
        <p className={overdue ? "text-warning" : "text-ink-subtle"}>
          {dateLabel ? `${dateLabel} ` : ""}
          {dateMs != null ? formatDate(new Date(dateMs).toISOString()) : "—"}
        </p>
      </div>

      {/* Last update */}
      <div className={`tnum text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className="text-ink">{relativeUpdated(item.updated_at, nowMs)}</p>
        <p className="text-support">{latestWorkflowUpdate(item)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:justify-end">
        <Link
          href={action.href}
          className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-[8px] px-3 text-center text-[13px] font-semibold transition-colors lg:max-w-[11rem] ${
            attention
              ? "bg-ink text-white hover:bg-ink-muted"
              : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-page"
          }`}
        >
          {action.label}
        </Link>
        <CollaborationOverflowMenu
          detailHref={href}
          messagesHref={chatHref}
          unread={item.unread}
          primaryIsMessages={action.href === chatHref}
        />
      </div>
    </article>
  );
}

function CollaborationOverflowMenu({
  detailHref: detail,
  messagesHref: messages,
  unread,
  primaryIsMessages,
}: {
  detailHref: string;
  messagesHref: string;
  unread: boolean;
  primaryIsMessages: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="More collaboration actions"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-surface text-ink hover:border-line-strong hover:bg-page"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          <Link
            role="menuitem"
            href={detail}
            className="block rounded-[8px] px-3 py-2 text-sm font-medium text-ink hover:bg-page"
            onClick={() => setOpen(false)}
          >
            View details
          </Link>
          {!primaryIsMessages ? (
            <Link
              role="menuitem"
              href={messages}
              className="block rounded-[8px] px-3 py-2 text-sm font-medium text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              Open conversation
              {unread ? " · Unread" : ""}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
