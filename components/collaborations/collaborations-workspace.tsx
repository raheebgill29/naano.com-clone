"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { CollaborationListRow } from "@/components/collaborations/collaboration-row";
import { EmptyState } from "@/components/workspace/ui";
import {
  computeCollabCounts,
  filterCollaborations,
  type CollabSort,
  type CollabTab,
  type CollaborationListItem,
  type CollaborationListRole,
  type DeadlineFilter,
} from "@/lib/collaborations/list-data";
import {
  ACTIVE_COLLAB_STATUSES,
  STATUS_LABEL,
} from "@/lib/collaborations/status";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const TAB_KEYS = [
  "needs_attention",
  "active",
  "completed",
  "cancelled",
] as const;

const TAB_LABEL: Record<(typeof TAB_KEYS)[number], string> = {
  needs_attention: "Needs attention",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_FILTER_OPTIONS: CampaignCreatorStatus[] = [
  ...ACTIVE_COLLAB_STATUSES,
  "completed",
  "cancelled",
];

function basePath(role: CollaborationListRole) {
  return role === "brand" ? "/brand/collaborations" : "/creator/collaborations";
}

export function CollaborationsWorkspace({
  items,
  error,
  searchParams,
  loadedAtMs,
  role,
}: {
  items: CollaborationListItem[];
  error: string | null;
  searchParams: Record<string, string | string[] | undefined>;
  loadedAtMs: number;
  role: CollaborationListRole;
}) {
  const router = useRouter();
  const path = basePath(role);

  const tab = (first(searchParams.tab) as CollabTab | undefined) ?? "active";
  const sort = (first(searchParams.sort) as CollabSort | undefined) ?? "urgency";
  const deadline =
    (first(searchParams.deadline) as DeadlineFilter | undefined) ?? "all";
  const campaignId = first(searchParams.campaign) ?? "";
  const statusFilter =
    (first(searchParams.status) as CampaignCreatorStatus | "all" | undefined) ??
    "all";
  const qParam = first(searchParams.q) ?? "";
  const [query, setQuery] = useState(qParam);

  const counts = useMemo(() => computeCollabCounts(items), [items]);

  const campaigns = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.campaignId) map.set(item.campaignId, item.campaignName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const resolvedTab: CollabTab =
    tab === "needs_attention" ||
    tab === "active" ||
    tab === "awaiting" ||
    tab === "completed" ||
    tab === "cancelled"
      ? tab
      : "active";

  const filtered = useMemo(
    () =>
      filterCollaborations({
        items,
        tab: resolvedTab,
        q: qParam,
        campaignId,
        status: statusFilter === "all" ? "all" : statusFilter,
        deadline,
        sort,
        nowMs: loadedAtMs,
      }),
    [
      items,
      resolvedTab,
      qParam,
      campaignId,
      statusFilter,
      deadline,
      sort,
      loadedAtMs,
    ],
  );

  function pushParams(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      tab: tab !== "active" ? tab : undefined,
      q: (first(searchParams.q) ?? "").trim() || undefined,
      campaign: campaignId || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      deadline: deadline !== "all" ? deadline : undefined,
      sort: sort !== "urgency" ? sort : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim() || undefined });
  }

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (qParam.trim()) {
    chips.push({
      key: "q",
      label: `Search: ${qParam}`,
      clear: () => {
        setQuery("");
        pushParams({ q: undefined });
      },
    });
  }
  if (campaignId) {
    const name =
      campaigns.find((c) => c.id === campaignId)?.name ?? "Campaign";
    chips.push({
      key: "campaign",
      label: `Campaign: ${name}`,
      clear: () => pushParams({ campaign: undefined }),
    });
  }
  if (statusFilter !== "all") {
    chips.push({
      key: "status",
      label: `Status: ${STATUS_LABEL[statusFilter]}`,
      clear: () => pushParams({ status: undefined }),
    });
  }
  if (deadline !== "all") {
    chips.push({
      key: "deadline",
      label:
        deadline === "upcoming" ? "Deadline: upcoming" : "Deadline: overdue",
      clear: () => pushParams({ deadline: undefined }),
    });
  }
  if (tab === "awaiting") {
    chips.push({
      key: "tab",
      label: "Awaiting the other party",
      clear: () => pushParams({ tab: undefined }),
    });
  }

  const emptyCta =
    role === "brand" ? (
      <Link href="/brand/campaigns" className="text-sm font-semibold text-accent">
        Open campaigns
      </Link>
    ) : (
      <Link
        href="/creator/opportunities"
        className="text-sm font-semibold text-accent"
      >
        View opportunities
      </Link>
    );

  if (error) {
    return (
      <EmptyState
        title="Could not load collaborations"
        description={error}
        action={
          <Link href={path} className="text-sm font-semibold text-accent">
            Try again
          </Link>
        }
      />
    );
  }

  const firstUse = items.length === 0;

  return (
    <div className="space-y-5">
      <SummaryStrip
        counts={counts}
        active={tab}
        onSelect={(key) =>
          pushParams({
            tab: key === "active" ? undefined : key,
          })
        }
      />

      <div
        role="tablist"
        aria-label="Collaboration lists"
        className="flex flex-wrap gap-2"
      >
        {TAB_KEYS.map((key) => {
          const selected = tab === key;
          const count =
            key === "needs_attention"
              ? counts.needsAttention
              : key === "active"
                ? counts.active
                : key === "completed"
                  ? counts.completed
                  : counts.cancelled;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() =>
                pushParams({ tab: key === "active" ? undefined : key })
              }
              className={`rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                selected
                  ? "bg-accent text-white"
                  : "border border-line bg-surface text-ink hover:bg-page"
              }`}
            >
              {TAB_LABEL[key]}
              <span
                className={`ml-1.5 tabular-nums ${selected ? "text-white/80" : "text-ink-subtle"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-line bg-surface p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            onSubmit={onSearchSubmit}
            className="relative min-w-0 flex-1"
            role="search"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                role === "brand"
                  ? "Search campaign or creator"
                  : "Search campaign or brand"
              }
              aria-label="Search collaborations"
              className="w-full rounded-[12px] border border-line bg-page px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="collab-campaign">
              Campaign
            </label>
            <select
              id="collab-campaign"
              value={campaignId}
              onChange={(event) =>
                pushParams({
                  campaign: event.target.value || undefined,
                })
              }
              className="max-w-[11rem] truncate rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="collab-status">
              Status
            </label>
            <select
              id="collab-status"
              value={statusFilter}
              onChange={(event) =>
                pushParams({
                  status:
                    event.target.value === "all"
                      ? undefined
                      : event.target.value,
                })
              }
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="all">All statuses</option>
              {STATUS_FILTER_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABEL[key]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="collab-deadline">
              Deadline
            </label>
            <select
              id="collab-deadline"
              value={deadline}
              onChange={(event) =>
                pushParams({
                  deadline:
                    event.target.value === "all"
                      ? undefined
                      : event.target.value,
                })
              }
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="all">Any deadline</option>
              <option value="upcoming">Upcoming (30 days)</option>
              <option value="overdue">Overdue</option>
            </select>

            <label className="sr-only" htmlFor="collab-sort">
              Sort
            </label>
            <select
              id="collab-sort"
              value={sort}
              onChange={(event) =>
                pushParams({
                  sort:
                    event.target.value === "urgency"
                      ? undefined
                      : event.target.value,
                })
              }
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="urgency">Sort: urgency</option>
              <option value="updated">Recently updated</option>
              <option value="target">Target date</option>
            </select>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink hover:border-line-strong"
              >
                {chip.label}
                <span aria-hidden className="text-ink-subtle">
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                router.push(path);
              }}
              className="text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </div>

      {firstUse ? (
        <EmptyState
          title={
            role === "brand"
              ? "No collaborations yet"
              : "No collaborations yet"
          }
          description={
            role === "brand"
              ? "Invite creators from a campaign. Accepted work shows up here for review and delivery."
              : "When you accept an invitation, drafts, deadlines, and publishing steps appear here."
          }
          action={emptyCta}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No collaborations match"
          description="Try another tab or clear filters to see the rest of your history."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                router.push(path);
              }}
              className="text-sm font-semibold text-accent"
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <CollaborationListRow item={item} nowMs={loadedAtMs} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryStrip({
  counts,
  active,
  onSelect,
}: {
  counts: ReturnType<typeof computeCollabCounts>;
  active: CollabTab;
  onSelect: (key: CollabTab) => void;
}) {
  const cells: Array<{ key: CollabTab; label: string; value: number }> = [
    { key: "needs_attention", label: "Needs attention", value: counts.needsAttention },
    { key: "active", label: "Active", value: counts.active },
    { key: "awaiting", label: "Awaiting the other party", value: counts.awaiting },
    { key: "completed", label: "Completed", value: counts.completed },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cells.map((cell) => {
        const selected = active === cell.key;
        return (
          <button
            key={cell.key}
            type="button"
            onClick={() => onSelect(cell.key)}
            className={`rounded-[14px] border px-3 py-3 text-left shadow-[var(--shadow-sm)] transition-colors duration-150 ${
              selected
                ? "border-accent/40 bg-accent-soft"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
              {cell.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-ink">
              {cell.value}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function CollaborationsListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="h-36 animate-pulse rounded-[14px] border border-line bg-surface"
        />
      ))}
    </ul>
  );
}
