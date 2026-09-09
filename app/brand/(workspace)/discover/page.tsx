import Link from "next/link";

import { MarketplaceFilters } from "@/components/marketplace/filters";
import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import {
  getSavedCreatorIds,
  listMarketplaceCreators,
  listSavedCreators,
} from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toInt(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export default async function BrandDiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const params = await searchParams;
  const savedOnly = first(params.saved) === "1";
  const page = Math.max(1, toInt(first(params.page)) ?? 1);

  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!brand) {
    return (
      <EmptyState
        title="Brand profile missing"
        description="Complete brand onboarding before using the marketplace."
      />
    );
  }

  const { ids: savedIds } = await getSavedCreatorIds(brand.id);

  const facetSource = await listMarketplaceCreators({ pageSize: 100, page: 1 });
  const topics = Array.from(
    new Set(facetSource.creators.flatMap((c) => c.topics)),
  ).sort();
  const languages = Array.from(
    new Set(facetSource.creators.flatMap((c) => c.languages)),
  ).sort();

  let creators = facetSource.creators;
  let total = facetSource.total;
  let error = facetSource.error;

  if (savedOnly) {
    const saved = await listSavedCreators(brand.id);
    creators = saved.creators.filter((c) => c.availability === "available");
    total = creators.length;
    error = saved.error;
  } else {
    const result = await listMarketplaceCreators({
      q: first(params.q),
      topic: first(params.topic) || undefined,
      language: first(params.language) || undefined,
      minPrice: toInt(first(params.minPrice)),
      maxPrice: toInt(first(params.maxPrice)),
      minFollowers: toInt(first(params.minFollowers)),
      maxFollowers: toInt(first(params.maxFollowers)),
      sort: (first(params.sort) as
        | "relevance"
        | "price_asc"
        | "price_desc"
        | "followers_desc"
        | undefined) ?? undefined,
      page,
      pageSize: 12,
    });
    creators = result.creators;
    total = result.total;
    error = result.error;
  }

  const hasFilters = Boolean(
    first(params.q) ||
      first(params.topic) ||
      first(params.language) ||
      first(params.minPrice) ||
      first(params.maxPrice) ||
      first(params.minFollowers) ||
      first(params.maxFollowers) ||
      savedOnly,
  );

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Discover creators"
        description="Browse published, available creator cards. Results stay empty until creators publish real profiles."
        actions={
          <Link
            href="/brand/shortlist"
            className="rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f8fa]"
          >
            Open shortlist
          </Link>
        }
      />

      <MarketplaceFilters
        searchParams={params}
        topics={topics}
        languages={languages}
      />

      {error ? (
        <EmptyState
          title="Could not load marketplace"
          description={error}
        />
      ) : creators.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No creators match these filters"
              : "No published creators yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or broadening price and follower ranges."
              : "When creators publish their cards, they will appear here automatically."
          }
          action={
            hasFilters ? (
              <Link
                href="/brand/discover"
                className="text-sm font-semibold text-accent"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-support">
            Showing {creators.length} of {total} creators
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {creators.map((creator) => (
              <li key={creator.id}>
                <CreatorPublicCard
                  compact
                  creator={creator}
                  href={`/brand/creators/${creator.slug}`}
                  actions={
                    <SaveCreatorButton
                      creatorId={creator.id}
                      initiallySaved={savedIds.has(creator.id)}
                    />
                  }
                />
              </li>
            ))}
          </ul>
          {!savedOnly && totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={`/brand/discover?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params)
                        .filter(([, v]) => typeof v === "string")
                        .map(([k, v]) => [k, String(v)]),
                    ),
                    page: String(page - 1),
                  }).toString()}`}
                  className="text-sm font-semibold text-accent"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-support">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/brand/discover?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params)
                        .filter(([, v]) => typeof v === "string")
                        .map(([k, v]) => [k, String(v)]),
                    ),
                    page: String(page + 1),
                  }).toString()}`}
                  className="text-sm font-semibold text-accent"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
