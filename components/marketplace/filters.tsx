import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function MarketplaceFilters({
  searchParams,
  topics,
  languages,
}: {
  searchParams: SearchParams;
  topics: string[];
  languages: string[];
}) {
  const q = first(searchParams.q) ?? "";
  const topic = first(searchParams.topic) ?? "";
  const language = first(searchParams.language) ?? "";
  const minPrice = first(searchParams.minPrice) ?? "";
  const maxPrice = first(searchParams.maxPrice) ?? "";
  const minFollowers = first(searchParams.minFollowers) ?? "";
  const maxFollowers = first(searchParams.maxFollowers) ?? "";
  const sort = first(searchParams.sort) ?? "followers_desc";
  const saved = first(searchParams.saved) === "1";

  return (
    <form
      method="get"
      className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-support">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, headline, or topic"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">Specialty</span>
          <select
            name="topic"
            defaultValue={topic}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">All specialties</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">Language</span>
          <select
            name="language"
            defaultValue={language}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">All languages</option>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">
            Min price (cents)
          </span>
          <input
            name="minPrice"
            type="number"
            min={0}
            defaultValue={minPrice}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">
            Max price (cents)
          </span>
          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={maxPrice}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">Min followers</span>
          <input
            name="minFollowers"
            type="number"
            min={0}
            defaultValue={minFollowers}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">Max followers</span>
          <input
            name="maxFollowers"
            type="number"
            min={0}
            defaultValue={maxFollowers}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-support">Sort</span>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="followers_desc">Followers</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="relevance">Relevance</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="saved"
            value="1"
            defaultChecked={saved}
            className="rounded border-line"
          />
          Saved only
        </label>
        <button
          type="submit"
          className="inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Apply filters
        </button>
        <Link
          href="/brand/discover"
          className="text-sm font-semibold text-support hover:text-ink"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
