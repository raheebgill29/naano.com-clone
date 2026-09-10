"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { CampaignListRow } from "@/components/campaigns/campaign-row";
import { EmptyState } from "@/components/workspace/ui";
import type { CampaignListItem } from "@/lib/campaigns/list-data";
import {
  CAMPAIGN_STATUS_LABEL,
  campaignStatusBadgeClass,
} from "@/lib/campaigns/status";
import type { CampaignStatus } from "@/lib/supabase/database.types";

type StatusFilter = CampaignStatus | "open";
type SortKey = "updated" | "newest" | "target" | "name";
type DateFilter = "all" | "upcoming" | "overdue";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_KEYS: CampaignStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
];

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

  return (
    <div className="space-y-5">
      <StatusSummary
        counts={counts}
        active={statusFilter}
        onSelect={(key) =>
          pushParams({
            status: key === "open" ? undefined : key,
          })
        }
      />

      <div className="rounded-[12px] border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            onSubmit={onSearchSubmit}
            className="relative min-w-0 flex-1"
            role="search"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, product, or objective"
              aria-label="Search campaigns"
              className="w-full rounded-[12px] border border-line bg-page px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="campaign-status">
              Status
            </label>
            <select
              id="campaign-status"
              value={statusFilter}
              onChange={(event) =>
                pushParams({
                  status:
                    event.target.value === "open"
                      ? undefined
                      : event.target.value,
                })
              }
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="open">All open</option>
              {STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CAMPAIGN_STATUS_LABEL[key]}
                </option>
              ))}
            </select>

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
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
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
              className="rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="updated">Recently updated</option>
              <option value="newest">Newest</option>
              <option value="target">Target date</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink hover:bg-page"
            >
              {chip.label}
              <span aria-hidden>×</span>
            </button>
          ))}
          <Link
            href="/brand/campaigns"
            className="text-xs font-semibold text-accent hover:text-accent-hover"
            onClick={() => setQuery("")}
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <p className="text-sm text-support">
        {filtered.length === total
          ? `${total} campaign${total === 1 ? "" : "s"}`
          : `${filtered.length} of ${total} campaigns`}
      </p>

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
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <CampaignListRow item={item} nowMs={loadedAtMs} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusSummary({
  counts,
  active,
  onSelect,
}: {
  counts: Record<CampaignStatus, number>;
  active: StatusFilter;
  onSelect: (key: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_KEYS.map((key) => {
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`inline-flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition-colors duration-150 ${
              selected
                ? "border-accent/30 bg-accent-soft"
                : "border-line bg-surface hover:bg-page"
            }`}
          >
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(key)}`}
            >
              {CAMPAIGN_STATUS_LABEL[key]}
            </span>
            <span className="text-sm font-semibold text-ink">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CampaignsListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="h-36 animate-pulse rounded-[12px] border border-line bg-surface"
        />
      ))}
    </ul>
  );
}
