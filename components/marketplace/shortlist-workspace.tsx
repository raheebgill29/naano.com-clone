"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  ShortlistCreatorCard,
  ShortlistCreatorCardSkeleton,
} from "@/components/marketplace/shortlist-creator-card";
import { EmptyState } from "@/components/workspace/ui";
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

  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-line bg-surface p-2.5 sm:p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            role="search"
            className="relative min-w-0 flex-1"
            onSubmit={(event) => event.preventDefault()}
          >
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle"
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="6.25"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="m16 16 3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, headline, or specialty"
              aria-label="Search saved creators"
              className="w-full rounded-[12px] border border-line bg-page py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-subtle"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-surface hover:text-ink"
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
              className="min-w-[8.5rem] rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="">Specialty</option>
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
              className="min-w-[8.5rem] rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="">Language</option>
              {languages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`inline-flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                moreActive
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink hover:bg-page"
              }`}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              More filters
            </button>
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
              <span aria-hidden className="text-ink-subtle">
                ×
              </span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-accent hover:text-accent-hover"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-support">
          {filtered.length === creators.length
            ? `${creators.length} saved creator${creators.length === 1 ? "" : "s"}`
            : `${filtered.length} of ${creators.length} saved creators`}
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-support">
          <span className="whitespace-nowrap">Sort by</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort saved creators"
            className="rounded-[12px] border border-line bg-surface px-3 py-2 text-sm font-medium text-ink"
          >
            <option value="recent">Recently saved</option>
            <option value="followers_desc">Most followers</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
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
        <ul className="space-y-3">
          {filtered.map((creator) => (
            <li key={creator.id} className="min-w-0">
              <ShortlistCreatorCard
                creator={creator}
                campaigns={campaigns}
              />
            </li>
          ))}
        </ul>
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
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index}>
          <ShortlistCreatorCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
