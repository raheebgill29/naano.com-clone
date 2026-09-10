"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  COLLAB_TABLE_COLUMNS,
  CollaborationListRow,
} from "@/components/collaborations/collaboration-row";
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

const TAB_LABEL = {
  needs_attention: "Needs your action",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

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

  const selectClass =
    "h-9 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] font-medium text-ink hover:border-line-strong";

  const tabs: Array<{ key: CollabTab; label: string; count: number }> = [
    { key: "needs_attention", label: TAB_LABEL.needs_attention, count: counts.needsAttention },
    { key: "active", label: TAB_LABEL.active, count: counts.active },
    { key: "awaiting", label: "Awaiting other party", count: counts.awaiting },
    { key: "completed", label: TAB_LABEL.completed, count: counts.completed },
    { key: "cancelled", label: TAB_LABEL.cancelled, count: counts.cancelled },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Collaboration lists"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((entry) => {
          const selected = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() =>
                pushParams({ tab: entry.key === "active" ? undefined : entry.key })
              }
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                selected
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {entry.label}
              <span
                className={`tnum rounded-[5px] px-1.5 py-px text-[11px] ${
                  selected
                    ? "bg-ink text-white"
                    : entry.key === "needs_attention" && entry.count > 0
                      ? "bg-accent-soft text-accent"
                      : "bg-page text-ink-subtle"
                }`}
              >
                {entry.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={onSearchSubmit}
          className="relative min-w-0 flex-1 lg:max-w-sm"
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
            className="h-9 w-full rounded-[8px] border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-subtle hover:border-line-strong focus:border-ink"
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
            className={`${selectClass} max-w-[11rem] truncate`}
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
            className={selectClass}
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
            className={selectClass}
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
            className={selectClass}
          >
            <option value="urgency">Sort: urgency</option>
            <option value="updated">Recently updated</option>
            <option value="target">Target date</option>
          </select>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-ink px-2 py-1 text-[11px] font-semibold text-white hover:bg-ink-muted"
            >
              {chip.label}
              <span aria-hidden className="text-white/70">
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
            className="ml-1 text-[12px] font-semibold text-ink-muted hover:text-ink"
          >
            Reset filters
          </button>
        </div>
      ) : null}

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
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div
            className={`hidden gap-x-4 border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle lg:grid ${COLLAB_TABLE_COLUMNS}`}
          >
            <span className="pl-4">{role === "brand" ? "Creator" : "Brand"}</span>
            <span>Stage</span>
            <span>Next action</span>
            <span>Deliverable</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {filtered.map((item) => (
              <li key={item.id}>
                <CollaborationListRow item={item} nowMs={loadedAtMs} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CollaborationsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <ul className="divide-y divide-line">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-4">
            <div className="h-11 w-11 animate-pulse rounded-full bg-page" />
            <div className="h-6 w-48 animate-pulse rounded bg-page" />
            <div className="hidden h-4 w-40 animate-pulse rounded bg-page lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-page lg:block" />
            <div className="ml-auto h-9 w-32 animate-pulse rounded-[8px] bg-page" />
          </li>
        ))}
      </ul>
    </div>
  );
}
