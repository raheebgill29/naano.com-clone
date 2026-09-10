"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  ShortlistCreatorCard,
  ShortlistCreatorCardSkeleton,
} from "@/components/marketplace/shortlist-creator-card";
import {
  EmptyState,
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import type {
  CampaignStatus,
  MarketplaceCreator,
} from "@/lib/supabase/database.types";

type SortKey = "recent" | "followers_desc" | "price_asc" | "price_desc";

type Chip = {
  key: string;
  label: string;
  clear: () => void;
};

function unitsToCents(units: string) {
  const raw = units.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Compact comparison strip across the (filtered) shortlist. */
function ShortlistSummary({
  creators,
  total,
}: {
  creators: MarketplaceCreator[];
  total: number;
}) {
  if (total === 0) return null;
  const count = creators.length;
  const reach = creators.reduce((sum, c) => sum + c.audience_size, 0);
  const prices = creators.map((c) => c.price_cents);
  const currency = creators[0]?.currency ?? "USD";
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const totalRate = prices.reduce((a, b) => a + b, 0);
  const available = creators.filter((c) => c.availability === "available").length;
  const specialties = new Set(creators.flatMap((c) => c.topics)).size;

  const cells: Array<{ label: string; value: string }> = [
    { label: "Comparing", value: `${count}` },
    { label: "Combined reach", value: formatCompactCount(reach) },
    {
      label: "Rate range",
      value: count
        ? min === max
          ? formatPriceCents(min, currency)
          : `${formatPriceCents(min, currency)}–${formatPriceCents(max, currency)}`
        : "—",
    },
    { label: "Book all", value: formatPriceCents(totalRate, currency) },
    { label: "Available", value: `${available}/${count}` },
    { label: "Specialties", value: `${specialties}` },
  ];

  return (
    <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[12px] border border-line bg-surface sm:grid-cols-6">
      {cells.map((cell) => (
        <div key={cell.label} className="px-4 py-3">
          <dt className="text-[11px] font-medium text-ink-subtle">{cell.label}</dt>
          <dd className="display tnum mt-0.5 truncate text-[1.5rem] text-ink">
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ShortlistWorkspace({
  creators,
  campaigns,
  error,
}: {
  creators: MarketplaceCreator[];
  campaigns: Array<{
    id: string;
    campaign_name: string;
    status: CampaignStatus;
  }>;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState<
    "all" | "available" | "unavailable"
  >("all");
  const [minPriceUnits, setMinPriceUnits] = useState("");
  const [maxPriceUnits, setMaxPriceUnits] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetTitleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  const topics = useMemo(
    () => Array.from(new Set(creators.flatMap((c) => c.topics))).sort(),
    [creators],
  );
  const languages = useMemo(
    () => Array.from(new Set(creators.flatMap((c) => c.languages))).sort(),
    [creators],
  );

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    sheetRef.current
      ?.querySelector<HTMLElement>("button, input, select")
      ?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const minCents = unitsToCents(minPriceUnits);
    const maxCents = unitsToCents(maxPriceUnits);

    let list = creators.map((creator, index) => ({ creator, index }));

    if (needle) {
      list = list.filter(({ creator }) =>
        [creator.full_name, creator.headline, ...creator.topics]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    if (topic) {
      list = list.filter(({ creator }) => creator.topics.includes(topic));
    }
    if (language) {
      list = list.filter(({ creator }) => creator.languages.includes(language));
    }
    if (availability === "available") {
      list = list.filter(
        ({ creator }) => creator.availability === "available",
      );
    } else if (availability === "unavailable") {
      list = list.filter(
        ({ creator }) => creator.availability === "unavailable",
      );
    }
    if (minCents != null) {
      list = list.filter(({ creator }) => creator.price_cents >= minCents);
    }
    if (maxCents != null) {
      list = list.filter(({ creator }) => creator.price_cents <= maxCents);
    }

    if (sort === "followers_desc") {
      list = [...list].sort(
        (a, b) => b.creator.audience_size - a.creator.audience_size,
      );
    } else if (sort === "price_asc") {
      list = [...list].sort(
        (a, b) => a.creator.price_cents - b.creator.price_cents,
      );
    } else if (sort === "price_desc") {
      list = [...list].sort(
        (a, b) => b.creator.price_cents - a.creator.price_cents,
      );
    } else {
      list = [...list].sort((a, b) => a.index - b.index);
    }

    return list.map((row) => row.creator);
  }, [
    creators,
    query,
    topic,
    language,
    availability,
    minPriceUnits,
    maxPriceUnits,
    sort,
  ]);

  const chips = useMemo(() => {
    const list: Chip[] = [];
    if (query.trim()) {
      list.push({
        key: "q",
        label: `Search: ${query.trim()}`,
        clear: () => setQuery(""),
      });
    }
    if (topic) {
      list.push({
        key: "topic",
        label: `Specialty: ${topic}`,
        clear: () => setTopic(""),
      });
    }
    if (language) {
      list.push({
        key: "language",
        label: `Language: ${language}`,
        clear: () => setLanguage(""),
      });
    }
    if (availability !== "all") {
      list.push({
        key: "availability",
        label:
          availability === "available" ? "Available only" : "Unavailable only",
        clear: () => setAvailability("all"),
      });
    }
    if (minPriceUnits || maxPriceUnits) {
      const label =
        minPriceUnits && maxPriceUnits
          ? `Price: $${minPriceUnits}–$${maxPriceUnits}`
          : minPriceUnits
            ? `Price: from $${minPriceUnits}`
            : `Price: up to $${maxPriceUnits}`;
      list.push({
        key: "price",
        label,
        clear: () => {
          setMinPriceUnits("");
          setMaxPriceUnits("");
        },
      });
    }
    return list;
  }, [
    query,
    topic,
    language,
    availability,
    minPriceUnits,
    maxPriceUnits,
  ]);

  const moreActive = Boolean(
    availability !== "all" || minPriceUnits || maxPriceUnits,
  );

  function clearAllFilters() {
    setQuery("");
    setTopic("");
    setLanguage("");
    setAvailability("all");
    setMinPriceUnits("");
    setMaxPriceUnits("");
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load shortlist"
        description={error}
        action={
          <Link
            href="/brand/shortlist"
            className="text-sm font-semibold text-accent"
          >
            Try again
          </Link>
        }
      />
    );
  }

  if (creators.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-soft text-accent"
          aria-hidden
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 20s-6.5-4.1-6.5-9.1A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 6.5 2.7C18.5 15.9 12 20 12 20Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="mt-4 text-base font-semibold text-ink">
          No saved creators yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-support">
          Save creators from the marketplace to review them here and invite them
          to campaigns when you are ready.
        </p>
        <Link
          href="/brand/discover"
          className="mt-5 inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Browse creators
        </Link>
      </div>
    );
  }

  const selectClass =
    "h-10 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-line-strong";

  return (
    <div className="space-y-4">
      <ShortlistSummary creators={filtered} total={creators.length} />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          role="search"
          className="relative min-w-0 flex-1"
          onSubmit={(event) => event.preventDefault()}
        >
          <span
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-subtle"
            aria-hidden
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
              <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved creators"
            aria-label="Search saved creators"
            className="h-10 w-full rounded-[10px] border border-line bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-ink-subtle hover:border-line-strong focus:border-ink"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-page hover:text-ink"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="shortlist-topic">
            Specialty
          </label>
          <select
            id="shortlist-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className={`${selectClass} min-w-[8rem]`}
          >
            <option value="">All specialties</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="shortlist-language">
            Language
          </label>
          <select
            id="shortlist-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className={`${selectClass} min-w-[7.5rem]`}
          >
            <option value="">Any language</option>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort saved creators"
            className={`${selectClass} min-w-[8rem]`}
          >
            <option value="recent">Recently saved</option>
            <option value="followers_desc">Most followers</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`inline-flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-semibold transition-colors duration-150 ${
              moreActive
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink hover:border-line-strong"
            }`}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            Filters
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
        <p className="tnum text-[13px] text-support">
          {filtered.length === creators.length
            ? `${creators.length} saved creator${creators.length === 1 ? "" : "s"}`
            : `${filtered.length} of ${creators.length} saved creators`}
        </p>
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
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-1 text-[12px] font-semibold text-ink-muted hover:text-ink"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No creators match these filters"
          description="Try clearing filters or broadening specialty, language, or price."
          action={
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-semibold text-accent"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,4fr)] gap-4 border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle lg:grid">
            <span>Creator</span>
            <span>Audience</span>
            <span>Rate</span>
            <span className="text-right">Invite</span>
          </div>
          <ul className="divide-y divide-line">
            {filtered.map((creator) => (
              <li key={creator.id} className="min-w-0">
                <ShortlistCreatorCard
                  creator={creator}
                  campaigns={campaigns}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close filters"
            onClick={() => setMoreOpen(false)}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-[var(--shadow)] sm:rounded-[16px]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id={sheetTitleId} className="text-base font-semibold text-ink">
                More filters
              </h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-ink-subtle hover:bg-page"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-support">
                  Availability
                </span>
                <select
                  value={availability}
                  onChange={(event) =>
                    setAvailability(
                      event.target.value as "all" | "available" | "unavailable",
                    )
                  }
                  className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Min price (USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={minPriceUnits}
                    onChange={(event) => setMinPriceUnits(event.target.value)}
                    placeholder="e.g. 200"
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Max price (USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={maxPriceUnits}
                    onChange={(event) => setMaxPriceUnits(event.target.value)}
                    placeholder="e.g. 800"
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShortlistGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <ul className="divide-y divide-line">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <ShortlistCreatorCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
