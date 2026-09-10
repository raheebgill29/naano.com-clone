"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function centsToUnits(cents: string) {
  if (!cents) return "";
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return String(n / 100);
}

function unitsToCents(units: string) {
  const raw = units.trim();
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.round(n * 100));
}

type Chip = {
  key: string;
  label: string;
  clearParams: string[];
};

const SORT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  followers_desc: "Most followers",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

export function MarketplaceFilters({
  searchParams,
  topics,
  languages,
  resultSummary,
}: {
  searchParams: SearchParams;
  topics: string[];
  languages: string[];
  resultSummary?: string;
}) {
  const router = useRouter();
  const q = first(searchParams.q) ?? "";
  const topic = first(searchParams.topic) ?? "";
  const language = first(searchParams.language) ?? "";
  const minPrice = first(searchParams.minPrice) ?? "";
  const maxPrice = first(searchParams.maxPrice) ?? "";
  const minFollowers = first(searchParams.minFollowers) ?? "";
  const maxFollowers = first(searchParams.maxFollowers) ?? "";
  const availability = first(searchParams.availability) ?? "available";
  const sort = first(searchParams.sort) ?? (q ? "relevance" : "followers_desc");
  const saved = first(searchParams.saved) === "1";

  // Remount when URL search changes so local draft stays aligned without effects.
  return (
    <MarketplaceFiltersInner
      key={[
        q,
        topic,
        language,
        minPrice,
        maxPrice,
        minFollowers,
        maxFollowers,
        availability,
        sort,
        saved ? "1" : "0",
      ].join("|")}
      q={q}
      topic={topic}
      language={language}
      minPrice={minPrice}
      maxPrice={maxPrice}
      minFollowers={minFollowers}
      maxFollowers={maxFollowers}
      availability={availability}
      sort={sort}
      saved={saved}
      topics={topics}
      languages={languages}
      resultSummary={resultSummary}
      onNavigate={(params) => {
        const qs = params.toString();
        router.push(qs ? `/brand/discover?${qs}` : "/brand/discover");
      }}
    />
  );
}

function MarketplaceFiltersInner({
  q,
  topic,
  language,
  minPrice,
  maxPrice,
  minFollowers,
  maxFollowers,
  availability,
  sort,
  saved,
  topics,
  languages,
  resultSummary,
  onNavigate,
}: {
  q: string;
  topic: string;
  language: string;
  minPrice: string;
  maxPrice: string;
  minFollowers: string;
  maxFollowers: string;
  availability: string;
  sort: string;
  saved: boolean;
  topics: string[];
  languages: string[];
  resultSummary?: string;
  onNavigate: (params: URLSearchParams) => void;
}) {
  const [query, setQuery] = useState(q);
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetTitleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

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

  function buildParams(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: query.trim() || undefined,
      topic: topic || undefined,
      language: language || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      minFollowers: minFollowers || undefined,
      maxFollowers: maxFollowers || undefined,
      availability:
        availability && availability !== "available" ? availability : undefined,
      sort: sort !== "followers_desc" ? sort : undefined,
      saved: saved ? "1" : undefined,
      ...overrides,
    };

    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value);
    }
    return next;
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNavigate(buildParams({ q: query.trim() || undefined, page: undefined }));
  }

  function onSelectChange(name: string, value: string) {
    onNavigate(
      buildParams({
        [name]: value || undefined,
        page: undefined,
      }),
    );
  }

  function onSortChange(value: string) {
    onNavigate(buildParams({ sort: value || undefined, page: undefined }));
  }

  function applyMoreFilters(form: HTMLFormElement) {
    const data = new FormData(form);
    const minPriceUnits = String(data.get("minPriceUnits") ?? "");
    const maxPriceUnits = String(data.get("maxPriceUnits") ?? "");
    onNavigate(
      buildParams({
        minPrice: unitsToCents(minPriceUnits) || undefined,
        maxPrice: unitsToCents(maxPriceUnits) || undefined,
        minFollowers: String(data.get("minFollowers") ?? "").trim() || undefined,
        maxFollowers: String(data.get("maxFollowers") ?? "").trim() || undefined,
        availability:
          String(data.get("availability") ?? "available") !== "available"
            ? String(data.get("availability"))
            : undefined,
        saved: data.get("saved") === "1" ? "1" : undefined,
        page: undefined,
      }),
    );
    setMoreOpen(false);
  }

  const chips = useMemo(() => {
    const list: Chip[] = [];
    if (q) list.push({ key: "q", label: `Search: ${q}`, clearParams: ["q"] });
    if (topic)
      list.push({
        key: "topic",
        label: `Specialty: ${topic}`,
        clearParams: ["topic"],
      });
    if (language)
      list.push({
        key: "language",
        label: `Language: ${language}`,
        clearParams: ["language"],
      });
    if (minPrice || maxPrice) {
      const min = minPrice ? centsToUnits(minPrice) : null;
      const max = maxPrice ? centsToUnits(maxPrice) : null;
      const label =
        min && max
          ? `Price: $${min}–$${max}`
          : min
            ? `Price: from $${min}`
            : `Price: up to $${max}`;
      list.push({
        key: "price",
        label,
        clearParams: ["minPrice", "maxPrice"],
      });
    }
    if (minFollowers || maxFollowers) {
      const label =
        minFollowers && maxFollowers
          ? `Followers: ${minFollowers}–${maxFollowers}`
          : minFollowers
            ? `Followers: ${minFollowers}+`
            : `Followers: up to ${maxFollowers}`;
      list.push({
        key: "followers",
        label,
        clearParams: ["minFollowers", "maxFollowers"],
      });
    }
    if (availability === "unavailable") {
      list.push({
        key: "availability",
        label: "Unavailable only",
        clearParams: ["availability"],
      });
    } else if (availability === "all") {
      list.push({
        key: "availability",
        label: "All availability",
        clearParams: ["availability"],
      });
    }
    if (saved) {
      list.push({
        key: "saved",
        label: "Saved only",
        clearParams: ["saved"],
      });
    }
    return list;
  }, [
    q,
    topic,
    language,
    minPrice,
    maxPrice,
    minFollowers,
    maxFollowers,
    availability,
    saved,
  ]);

  const moreActive = Boolean(
    minPrice ||
      maxPrice ||
      minFollowers ||
      maxFollowers ||
      (availability && availability !== "available") ||
      saved,
  );

  const selectClass =
    "h-10 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-line-strong";

  return (
    <div className="space-y-3">
      {/* Toolbar: prominent search + inline facets */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          onSubmit={onSearchSubmit}
          className="relative min-w-0 flex-1"
          role="search"
        >
          <span
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-subtle"
            aria-hidden
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
              <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creators by name, positioning, or specialty"
            aria-label="Search creators"
            className="h-12 w-full rounded-[12px] border border-line bg-surface pl-11 pr-11 text-[15px] text-ink placeholder:text-ink-subtle transition-[border-color] duration-150 hover:border-line-strong focus:border-ink"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute inset-y-0 right-3 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-page hover:text-ink"
              onClick={() => {
                setQuery("");
                onNavigate(buildParams({ q: undefined, page: undefined }));
              }}
            >
              ×
            </button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="marketplace-topic">
            Specialty
          </label>
          <select
            id="marketplace-topic"
            value={topic}
            onChange={(event) => onSelectChange("topic", event.target.value)}
            className={`${selectClass} min-w-[8rem]`}
          >
            <option value="">All specialties</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="marketplace-language">
            Language
          </label>
          <select
            id="marketplace-language"
            value={language}
            onChange={(event) => onSelectChange("language", event.target.value)}
            className={`${selectClass} min-w-[7.5rem]`}
          >
            <option value="">Any language</option>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="marketplace-sort">
            Sort
          </label>
          <select
            id="marketplace-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className={`${selectClass} min-w-[8rem]`}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Result summary + active chips */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
        <p className="tnum text-[13px] text-support">
          {resultSummary ?? "Browse creators"}
        </p>
        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  const overrides: Record<string, string | undefined> = {
                    page: undefined,
                  };
                  for (const param of chip.clearParams) {
                    overrides[param] = undefined;
                  }
                  if (chip.key === "q") setQuery("");
                  onNavigate(buildParams(overrides));
                }}
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-ink px-2 py-1 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-ink-muted"
              >
                {chip.label}
                <span aria-hidden className="text-white/70">
                  ×
                </span>
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <Link
              href="/brand/discover"
              className="ml-1 text-[12px] font-semibold text-ink-muted hover:text-ink"
            >
              Clear all
            </Link>
          </div>
        ) : null}
      </div>

      {/* Slide-over filter panel */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
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
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-[var(--shadow)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id={sheetTitleId} className="display text-[1.5rem] text-ink">
                Refine
              </h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-ink-subtle hover:bg-page hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                applyMoreFilters(event.currentTarget);
              }}
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <fieldset>
                  <legend className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
                    Price per post (USD)
                  </legend>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-[12px] text-support">Min</span>
                      <input
                        name="minPriceUnits"
                        type="number"
                        min={0}
                        step="1"
                        defaultValue={centsToUnits(minPrice)}
                        placeholder="200"
                        className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[12px] text-support">Max</span>
                      <input
                        name="maxPriceUnits"
                        type="number"
                        min={0}
                        step="1"
                        defaultValue={centsToUnits(maxPrice)}
                        placeholder="1,500"
                        className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
                    Followers
                  </legend>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-[12px] text-support">Min</span>
                      <input
                        name="minFollowers"
                        type="number"
                        min={0}
                        defaultValue={minFollowers}
                        className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[12px] text-support">Max</span>
                      <input
                        name="maxFollowers"
                        type="number"
                        min={0}
                        defaultValue={maxFollowers}
                        className="h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
                    Availability
                  </legend>
                  <select
                    name="availability"
                    defaultValue={availability}
                    className="mt-3 h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink"
                  >
                    <option value="available">Available now</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="all">All creators</option>
                  </select>
                </fieldset>

                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="saved"
                    value="1"
                    defaultChecked={saved}
                    className="h-4 w-4 rounded border-line accent-[var(--ink)]"
                  />
                  Shortlisted creators only
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-[10px] border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-page"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-muted"
                >
                  Show results
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { SORT_LABELS };
