"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  CAMPAIGN_TABLE_COLUMNS,
  CampaignListRow,
} from "@/components/campaigns/campaign-row";
import { EmptyState } from "@/components/workspace/ui";
import type { CampaignListItem } from "@/lib/campaigns/list-data";
import { CAMPAIGN_STATUS_LABEL } from "@/lib/campaigns/status";
import type { CampaignStatus } from "@/lib/supabase/database.types";

type StatusFilter = CampaignStatus | "open";
type SortKey = "updated" | "newest" | "target" | "name";
type DateFilter = "all" | "upcoming" | "overdue";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function CampaignsWorkspace({
  items,
  error,
  searchParams,
  loadedAtMs,
}: {
  items: CampaignListItem[];
  error: string | null;
  searchParams: Record<string, string | string[] | undefined>;
  loadedAtMs: number;
}) {
  const router = useRouter();
  const statusFilter =
    (first(searchParams.status) as StatusFilter | undefined) ?? "open";
  const sort = (first(searchParams.sort) as SortKey | undefined) ?? "updated";
  const dateFilter =
    (first(searchParams.date) as DateFilter | undefined) ?? "all";
  const qParam = first(searchParams.q) ?? "";

  const [query, setQuery] = useState(qParam);

  const counts = useMemo(() => {
    const next: Record<CampaignStatus, number> = {
      draft: 0,
      active: 0,
      paused: 0,
      completed: 0,
      archived: 0,
    };
    for (const item of items) next[item.status] += 1;
    return next;
  }, [items]);

  const total = items.length;

  const filtered = useMemo(() => {
    let list = [...items];

    if (statusFilter === "open") {
      list = list.filter((c) => c.status !== "archived");
    } else {
      list = list.filter((c) => c.status === statusFilter);
    }

    const needle = (first(searchParams.q) ?? "").trim().toLowerCase();
    if (needle) {
      list = list.filter((c) =>
        [c.campaign_name, c.product_or_company, c.objective]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }

    if (dateFilter === "upcoming") {
      list = list.filter((c) => c.isUpcoming30d);
    } else if (dateFilter === "overdue") {
      list = list.filter((c) => c.isOverdue);
    }

    if (sort === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sort === "target") {
      list.sort(
        (a, b) =>
          new Date(a.target_publish_date).getTime() -
          new Date(b.target_publish_date).getTime(),
      );
    } else if (sort === "name") {
      list.sort((a, b) => a.campaign_name.localeCompare(b.campaign_name));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }

    return list;
  }, [items, statusFilter, searchParams.q, dateFilter, sort]);

  function pushParams(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      status: statusFilter !== "open" ? statusFilter : undefined,
      q: (first(searchParams.q) ?? "").trim() || undefined,
      sort: sort !== "updated" ? sort : undefined,
      date: dateFilter !== "all" ? dateFilter : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `/brand/campaigns?${qs}` : "/brand/campaigns");
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim() || undefined });
  }

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (first(searchParams.q)?.trim()) {
    chips.push({
      key: "q",
      label: `Search: ${first(searchParams.q)}`,
      clear: () => {
        setQuery("");
        pushParams({ q: undefined });
      },
    });
  }
  if (statusFilter !== "open") {
    chips.push({
      key: "status",
      label: `Status: ${CAMPAIGN_STATUS_LABEL[statusFilter]}`,
      clear: () => pushParams({ status: undefined }),
    });
  }
  if (dateFilter !== "all") {
    chips.push({
      key: "date",
      label: dateFilter === "upcoming" ? "Target: upcoming" : "Target: overdue",
      clear: () => pushParams({ date: undefined }),
    });
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load campaigns"
        description={error}
        action={
          <Link
            href="/brand/campaigns"
            className="text-sm font-semibold text-accent"
          >
            Try again
          </Link>
        }
      />
    );
  }

  const selectClass =
    "h-9 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] font-medium text-ink hover:border-line-strong";

  return (
    <div className="space-y-4">
      <StatusTabs
        counts={counts}
        total={total}
        active={statusFilter}
        onSelect={(key) =>
          pushParams({
            status: key === "open" ? undefined : key,
          })
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={onSearchSubmit}
          className="relative min-w-0 flex-1 sm:max-w-sm"
          role="search"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaigns"
            aria-label="Search campaigns"
            className="h-9 w-full rounded-[8px] border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-subtle hover:border-line-strong focus:border-ink"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="campaign-date">
            Target date
          </label>
          <select
            id="campaign-date"
            value={dateFilter}
            onChange={(event) =>
              pushParams({
                date:
                  event.target.value === "all"
                    ? undefined
                    : event.target.value,
              })
            }
            className={selectClass}
          >
            <option value="all">Any target date</option>
            <option value="upcoming">Upcoming (30 days)</option>
            <option value="overdue">Overdue</option>
          </select>

          <label className="sr-only" htmlFor="campaign-sort">
            Sort
          </label>
          <select
            id="campaign-sort"
            value={sort}
            onChange={(event) =>
              pushParams({
                sort:
                  event.target.value === "updated"
                    ? undefined
                    : event.target.value,
              })
            }
            className={selectClass}
          >
            <option value="updated">Recently updated</option>
            <option value="newest">Newest</option>
            <option value="target">Target date</option>
            <option value="name">Name</option>
          </select>
          <span className="tnum text-[12px] text-support">
            {filtered.length === total
              ? `${total} campaign${total === 1 ? "" : "s"}`
              : `${filtered.length} of ${total}`}
          </span>
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
          <Link
            href="/brand/campaigns"
            className="ml-1 text-[12px] font-semibold text-ink-muted hover:text-ink"
            onClick={() => setQuery("")}
          >
            Clear all
          </Link>
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create a campaign brief, then invite published creators from the marketplace."
          action={
            <Link
              href="/brand/campaigns/new"
              className="inline-flex rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Create campaign
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No campaigns match these filters"
          description="Try clearing search or broadening status and date filters."
          action={
            <Link
              href="/brand/campaigns"
              className="text-sm font-semibold text-accent"
              onClick={() => setQuery("")}
            >
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div
            className={`hidden gap-x-4 border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle lg:grid ${CAMPAIGN_TABLE_COLUMNS}`}
          >
            <span className="pl-4">Campaign</span>
            <span>Status</span>
            <span>Roster</span>
            <span>Budget</span>
            <span>Progress</span>
            <span>Next</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {filtered.map((item) => (
              <li key={item.id}>
                <CampaignListRow item={item} nowMs={loadedAtMs} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const TAB_ORDER: Array<{ key: StatusFilter; label: string }> = [
  { key: "open", label: "All open" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

function StatusTabs({
  counts,
  total,
  active,
  onSelect,
}: {
  counts: Record<CampaignStatus, number>;
  total: number;
  active: StatusFilter;
  onSelect: (key: StatusFilter) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Campaign status"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {TAB_ORDER.map((tab) => {
        const selected = active === tab.key;
        const count =
          tab.key === "open" ? total - counts.archived : counts[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              selected
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            <span
              className={`tnum rounded-[5px] px-1.5 py-px text-[11px] ${
                selected ? "bg-ink text-white" : "bg-page text-ink-subtle"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CampaignsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <ul className="divide-y divide-line">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-4">
            <div className="h-6 w-56 animate-pulse rounded bg-page" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-page lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-page lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-page lg:block" />
            <div className="ml-auto h-9 w-32 animate-pulse rounded-[8px] bg-page" />
          </li>
        ))}
      </ul>
    </div>
  );
}
