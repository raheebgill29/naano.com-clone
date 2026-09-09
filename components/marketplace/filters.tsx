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

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line bg-surface p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            onSubmit={onSearchSubmit}
            className="relative min-w-0 flex-1"
            role="search"
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
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, headline, or topic"
              aria-label="Search creators"
              className="w-full rounded-[12px] border border-line bg-page py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-subtle transition-[border-color] duration-150 hover:border-line-strong focus:border-accent"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-surface hover:text-ink"
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
              className="min-w-[8.5rem] rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
            >
              <option value="">Specialty</option>
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
              onChange={(event) =>
                onSelectChange("language", event.target.value)
              }
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
              {moreActive ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  !
                </span>
              ) : null}
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
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-page"
            >
              {chip.label}
              <span aria-hidden className="text-ink-subtle">
                ×
              </span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <Link
            href="/brand/discover"
            className="text-xs font-semibold text-accent hover:text-accent-hover"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-support">
          {resultSummary ?? "Browse creators"}
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-support">
          <span className="whitespace-nowrap">Sort by</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Sort creators"
            className="rounded-[12px] border border-line bg-surface px-3 py-2 text-sm font-medium text-ink"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-ink-subtle hover:bg-page hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form
              className="overflow-y-auto px-5 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                applyMoreFilters(event.currentTarget);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Min price (USD)
                  </span>
                  <input
                    name="minPriceUnits"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={centsToUnits(minPrice)}
                    placeholder="e.g. 200"
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Max price (USD)
                  </span>
                  <input
                    name="maxPriceUnits"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={centsToUnits(maxPrice)}
                    placeholder="e.g. 800"
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Min followers
                  </span>
                  <input
                    name="minFollowers"
                    type="number"
                    min={0}
                    defaultValue={minFollowers}
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-support">
                    Max followers
                  </span>
                  <input
                    name="maxFollowers"
                    type="number"
                    min={0}
                    defaultValue={maxFollowers}
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-support">
                    Availability
                  </span>
                  <select
                    name="availability"
                    defaultValue={availability}
                    className="w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="all">All</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-ink sm:col-span-2">
                  <input
                    type="checkbox"
                    name="saved"
                    value="1"
                    defaultChecked={saved}
                    className="rounded border-line"
                  />
                  Saved creators only
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-[12px] border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-page"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Apply filters
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
