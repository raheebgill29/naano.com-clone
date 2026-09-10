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

  return (
    <article
      className={`rounded-[14px] border bg-surface shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[var(--shadow)] ${
        attention ? "border-warning/35" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-stretch lg:gap-0">
        {/* Main identity */}
        <div className="min-w-0 flex-[1.4] lg:pr-5">
          <div className="flex flex-wrap items-start gap-2">
            {attention ? (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning"
                title="Needs attention"
                aria-label="Needs attention"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={href}
                  className="min-w-0 break-words text-base font-semibold tracking-tight text-ink hover:text-accent"
                >
                  {item.campaign_name}
                </Link>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(item.status)}`}
                >
                  {CAMPAIGN_STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-support">
                {item.product_or_company}
                {item.objective ? ` · ${item.objective}` : null}
              </p>
              <p className="mt-2 text-xs text-ink-subtle">
                Target {formatDate(item.target_publish_date)} · Updated{" "}
                {relativeUpdated(item.updated_at, nowMs)}
              </p>
              {next ? (
                <p className="mt-2 text-xs font-semibold text-accent">
                  Next: {next.label}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="min-w-0 flex-1 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:px-5 lg:pt-0">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Metric label="Invited" value={String(item.stats.invited)} />
            <Metric label="Active" value={String(item.stats.active)} />
            <Metric
              label="Drafts"
              value={String(item.stats.draftsAwaitingReview)}
              emphasize={item.stats.draftsAwaitingReview > 0}
            />
            <Metric label="Done" value={String(item.stats.completed)} />
          </dl>

          {progress != null ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-ink-subtle">
                <span>Collaboration progress</span>
                <span>{progress}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-page"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Collaboration progress"
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="mt-3 text-xs font-semibold text-accent hover:text-accent-hover lg:hidden"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Hide details" : "More details"}
          </button>

          <div
            className={`mt-3 space-y-1 text-xs text-support ${detailsOpen ? "block" : "hidden lg:block"}`}
          >
            <p>
              Budget{" "}
              <span className="font-semibold text-ink">
                {formatPriceCents(item.budget_cents, item.currency)}
              </span>
              {item.stats.committedCents > 0 ? (
                <>
                  {" · "}Committed{" "}
                  <span className="font-semibold text-ink">
                    {formatPriceCents(item.stats.committedCents, item.currency)}
                  </span>
                </>
              ) : null}
            </p>
            <p>
              {item.stats.pending} pending · {item.post_count} post
              {item.post_count === 1 ? "" : "s"} planned
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center lg:w-[13.5rem] lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <CampaignPrimaryAction item={item} />
          <div className="flex gap-2">
            <Link
              href={href}
              className="inline-flex flex-1 items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-page"
            >
              Open
            </Link>
            <CampaignOverflowMenu item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-semibold ${emphasize ? "text-warning" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function CampaignPrimaryAction({ item }: { item: CampaignListItem }) {
  const next = getCampaignNextAction(item);
  if (!next) {
    return (
      <Link
        href={`/brand/campaigns/${item.id}`}
        className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        View campaign
      </Link>
    );
  }

  if (next.kind === "link" && next.href) {
    return (
      <Link
        href={next.href}
        className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
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
        className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 [&>span]:text-white [&_span+span]:hidden"
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
        className="inline-flex h-[42px] w-10 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink hover:bg-page"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 rounded-[14px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
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
