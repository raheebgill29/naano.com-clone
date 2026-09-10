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
  urgencyBorderTone,
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
  const tone = urgencyBorderTone(item, nowMs);
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

  return (
    <article
      className={`rounded-[12px] border bg-surface transition-[border-color,box-shadow] duration-150 hover:border-line-strong ${
        tone === "warning"
          ? "border-warning/40"
          : tone === "accent"
            ? "border-accent/35"
            : "border-line"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-stretch lg:gap-0">
        <div className="min-w-0 flex-[1.5] lg:pr-5">
          <div className="flex items-start gap-3">
            {attention ? (
              <span
                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-warning"
                title="Needs attention"
                aria-label="Needs attention"
              />
            ) : null}
            <ParticipantAvatar name={item.participantName} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={href}
                  className="min-w-0 break-words text-base font-semibold tracking-tight text-ink hover:text-accent"
                >
                  {item.campaignName}
                </Link>
                <span
                  className={`inline-flex shrink-0 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(item.status)}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
                {item.unread ? (
                  <span className="inline-flex shrink-0 items-center rounded-[8px] bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    Unread
                  </span>
                ) : null}
                {overdue ? (
                  <span className="inline-flex shrink-0 rounded-[8px] bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                    Overdue
                  </span>
                ) : upcoming && attention ? (
                  <span className="inline-flex shrink-0 rounded-[8px] bg-page px-2 py-0.5 text-[11px] font-semibold text-support">
                    Due soon
                  </span>
                ) : null}
              </div>

              <p className="mt-1 line-clamp-1 text-sm text-support">
                <span className="font-medium text-ink">{item.participantName}</span>
                {item.participantMeta ? ` · ${item.participantMeta}` : null}
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium text-ink-subtle">
                    Deliverable
                  </dt>
                  <dd className="mt-0.5 truncate font-medium text-ink">
                    {item.deliverableType}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium text-ink-subtle">
                    Compensation
                  </dt>
                  <dd className="mt-0.5 truncate font-semibold text-ink">
                    {compensation}
                  </dd>
                </div>
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <dt className="text-[11px] font-medium text-ink-subtle">
                    {dateLabel ?? "Date"}
                  </dt>
                  <dd
                    className={`mt-0.5 truncate font-medium ${
                      overdue ? "text-warning" : "text-ink"
                    }`}
                  >
                    {dateMs != null ? formatDate(new Date(dateMs).toISOString()) : "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-ink-subtle">
                Updated {relativeUpdated(item.updated_at, nowMs)} ·{" "}
                {latestWorkflowUpdate(item)}
              </p>

              <p className="mt-2 text-xs font-semibold text-accent">
                Next: {nextActionLabel(item)}
              </p>

              {action.waitingLabel ? (
                <p className="mt-1 text-xs font-medium text-support">
                  {action.waitingLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-[1.15] border-t border-line pt-4 lg:border-l lg:border-t-0 lg:px-5 lg:pt-0">
          <button
            type="button"
            className="text-xs font-semibold text-accent hover:text-accent-hover lg:hidden"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Hide progress" : "Show progress"}
          </button>
          <div className={`mt-2 ${detailsOpen ? "block" : "hidden lg:block"}`}>
            <CollaborationWorkflowProgress status={item.status} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center lg:w-[13.5rem] lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <Link
            href={action.href}
            className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {action.label}
          </Link>
          <div className="flex gap-2">
            <Link
              href={href}
              className="inline-flex flex-1 items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-page"
            >
              Open
            </Link>
            <CollaborationOverflowMenu
              detailHref={href}
              messagesHref={chatHref}
              unread={item.unread}
              primaryIsMessages={action.href === chatHref}
            />
          </div>
        </div>
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
        className="inline-flex h-[42px] w-10 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink hover:bg-page"
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
