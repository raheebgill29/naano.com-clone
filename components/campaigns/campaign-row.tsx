"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";

import {
  campaignNeedsAttention,
  campaignProgressPercent,
  getCampaignNextAction,
  type CampaignListItem,
} from "@/lib/campaigns/list-data";
import {
  CAMPAIGN_ACTION_LABEL,
  CAMPAIGN_STATUS_LABEL,
  analyzeCampaignLifecycleBlockers,
  availableCampaignActions,
  campaignStatusBadgeClass,
  type CampaignLifecycleAction,
} from "@/lib/campaigns/status";
import { transitionCampaignAction } from "@/lib/campaigns/actions";
import { formatPriceCents } from "@/components/workspace/ui";
import { appToast } from "@/lib/toast";

const CONFIRM_COPY: Partial<Record<CampaignLifecycleAction, string>> = {
  complete:
    "Mark this campaign complete? It will become read-only. You can archive it afterward.",
  archive:
    "Archive this campaign? It will leave the default list but history is kept.",
};

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

export const CAMPAIGN_TABLE_COLUMNS =
  "lg:grid-cols-[minmax(0,4fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,2.4fr)]";

export function CampaignListRow({
  item,
  nowMs,
}: {
  item: CampaignListItem;
  nowMs: number;
}) {
  const href = `/brand/campaigns/${item.id}`;
  const next = getCampaignNextAction(item);
  const attention = campaignNeedsAttention(item);
  const progress = campaignProgressPercent(item.stats);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const muted = item.status === "completed" || item.status === "archived";

  return (
    <article
      className={`grid gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-page/40 lg:items-center ${CAMPAIGN_TABLE_COLUMNS} ${
        muted ? "text-ink-muted" : ""
      }`}
    >
      {/* Campaign identity */}
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
            attention ? "bg-accent" : "bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className={`display block truncate text-[1.25rem] leading-tight hover:text-accent ${
              muted ? "text-ink-muted" : "text-ink"
            }`}
          >
            {item.campaign_name}
          </Link>
          <p className="mt-0.5 truncate text-[12px] text-support">
            {item.product_or_company}
            {item.objective ? ` · ${item.objective}` : null}
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

      {/* Status */}
      <div className={`${detailsOpen ? "block" : "hidden lg:block"}`}>
        <span
          className={`inline-flex rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(item.status)}`}
        >
          {CAMPAIGN_STATUS_LABEL[item.status]}
        </span>
      </div>

      {/* Roster */}
      <div className={`tnum text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className="font-semibold text-ink">
          {item.stats.invited} invited
        </p>
        <p className="text-support">
          {item.stats.active} active · {item.stats.completed} done
          {item.stats.draftsAwaitingReview > 0 ? (
            <span className="text-accent">
              {" "}· {item.stats.draftsAwaitingReview} to review
            </span>
          ) : null}
        </p>
      </div>

      {/* Budget */}
      <div className={`tnum text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className="font-semibold text-ink">
          {formatPriceCents(item.budget_cents, item.currency)}
        </p>
        <p className="text-support">
          {item.stats.committedCents > 0
            ? `${formatPriceCents(item.stats.committedCents, item.currency)} committed`
            : `${item.post_count} post${item.post_count === 1 ? "" : "s"} planned`}
        </p>
      </div>

      {/* Progress */}
      <div className={`${detailsOpen ? "block" : "hidden lg:block"}`}>
        {progress != null ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-ink-subtle">
              <span>Complete</span>
              <span className="tnum font-semibold text-ink">{progress}%</span>
            </div>
            <div
              className="mt-1 h-1 overflow-hidden rounded-full bg-page"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Collaboration progress"
            >
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <span className="text-[12px] text-ink-subtle">No creators yet</span>
        )}
      </div>

      {/* Next milestone + dates */}
      <div className={`text-[12px] ${detailsOpen ? "block" : "hidden lg:block"}`}>
        <p className="font-semibold text-ink">
          {next ? next.label : "—"}
        </p>
        <p className="tnum text-support">
          Target {formatDate(item.target_publish_date)}
        </p>
        <p className="tnum text-ink-subtle">
          Updated {relativeUpdated(item.updated_at, nowMs)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:justify-end">
        <div className="min-w-0 flex-1 lg:max-w-[11rem]">
          <CampaignPrimaryAction item={item} />
        </div>
        <CampaignOverflowMenu item={item} />
      </div>
    </article>
  );
}

function CampaignPrimaryAction({ item }: { item: CampaignListItem }) {
  const next = getCampaignNextAction(item);
  if (!next) {
    return (
      <Link
        href={`/brand/campaigns/${item.id}`}
        className="inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-ink px-3 text-[13px] font-semibold text-white hover:bg-ink-muted"
      >
        View campaign
      </Link>
    );
  }

  if (next.kind === "link" && next.href) {
    return (
      <Link
        href={next.href}
        className="inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-ink px-3 text-[13px] font-semibold text-white hover:bg-ink-muted"
      >
        {next.label}
      </Link>
    );
  }

  if (next.kind === "lifecycle" && next.action) {
    return (
      <LifecycleButton
        campaignId={item.id}
        action={next.action}
        label={next.label}
        requiresConfirm={next.requiresConfirm}
        className="inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-ink px-3 text-[13px] font-semibold text-white hover:bg-ink-muted disabled:opacity-60 [&>span]:text-white [&>span]:text-[13px] [&_span+span]:hidden"
      />
    );
  }

  return null;
}

function LifecycleButton({
  campaignId,
  action,
  label,
  requiresConfirm,
  className,
  disabled,
  reason,
}: {
  campaignId: string;
  action: CampaignLifecycleAction;
  label: string;
  requiresConfirm?: boolean;
  className?: string;
  disabled?: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (disabled) return;
    if (requiresConfirm) {
      const text = CONFIRM_COPY[action];
      if (text && !window.confirm(text)) return;
    }
    const fd = new FormData();
    fd.set("campaign_id", campaignId);
    fd.set("action", action);
    startTransition(async () => {
      const result = await transitionCampaignAction({}, fd);
      if (result.error) {
        appToast.error({
          title: result.error,
          id: `campaign-row:${campaignId}:${action}:error`,
        });
        return;
      }
      if (result.success) {
        appToast.success({
          title: result.success,
          id: `campaign-row:${campaignId}:${action}:ok`,
        });
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={reason}
      onClick={run}
      className={className}
    >
      <span className="text-sm font-semibold text-ink">{pending ? "Updating…" : label}</span>
      {reason ? (
        <span className="mt-0.5 text-[11px] font-normal text-support">{reason}</span>
      ) : null}
    </button>
  );
}

function CampaignOverflowMenu({ item }: { item: CampaignListItem }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const blockers = analyzeCampaignLifecycleBlockers(item.invitationStatuses);
  const actions = availableCampaignActions(item.status, blockers);

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
        aria-label="More campaign actions"
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
          className="absolute right-0 z-30 mt-2 w-64 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          {item.status === "draft" ? (
            <Link
              href={`/brand/campaigns/${item.id}`}
              role="menuitem"
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              Edit draft
            </Link>
          ) : null}
          <Link
            href={`/brand/campaigns/${item.id}`}
            role="menuitem"
            className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
            onClick={() => setOpen(false)}
          >
            View details
          </Link>
          {actions.map((entry) => (
            <LifecycleButton
              key={entry.action}
              campaignId={item.id}
              action={entry.action}
              label={CAMPAIGN_ACTION_LABEL[entry.action]}
              requiresConfirm={entry.requiresConfirm}
              disabled={!entry.enabled}
              reason={entry.reason}
              className="flex w-full flex-col rounded-[10px] px-3 py-2 text-left hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
            />
          ))}
          {actions.length === 0 && item.status !== "draft" ? (
            <p className="px-3 py-2 text-xs text-support">
              No lifecycle actions available.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
