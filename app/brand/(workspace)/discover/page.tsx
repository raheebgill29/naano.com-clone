import Link from "next/link";

import { MarketplaceFilters } from "@/components/marketplace/filters";
import { MarketplaceCreatorCard } from "@/components/marketplace/marketplace-card";
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

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value && key !== "page") {
      next.set(key, value);
    }
  }
  if (page > 1) next.set("page", String(page));
  const qs = next.toString();
  return qs ? `/brand/discover?${qs}` : "/brand/discover";
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
  const preferredCampaignId = first(params.campaignId);
  const availability =
    (first(params.availability) as
      | "available"
      | "unavailable"
      | "all"
      | undefined) ?? "available";

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

  const [{ data: eligibleCampaigns }, { ids: savedIds }, facetSource] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("id,campaign_name,status")
        .eq("brand_id", brand.id)
        .in("status", ["draft", "active"]),
      getSavedCreatorIds(brand.id),
      listMarketplaceCreators({ pageSize: 100, page: 1, availability: "all" }),
    ]);

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
    let list = saved.creators;
    if (availability === "available") {
      list = list.filter((c) => c.availability === "available");
    } else if (availability === "unavailable") {
      list = list.filter((c) => c.availability === "unavailable");
    }
    const q = first(params.q)?.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.full_name, c.headline, ...c.topics]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    const topic = first(params.topic);
    if (topic) list = list.filter((c) => c.topics.includes(topic));
    const language = first(params.language);
    if (language) list = list.filter((c) => c.languages.includes(language));
    const minPrice = toInt(first(params.minPrice));
    const maxPrice = toInt(first(params.maxPrice));
    const minFollowers = toInt(first(params.minFollowers));
    const maxFollowers = toInt(first(params.maxFollowers));
    if (minPrice != null) {
      list = list.filter((c) => c.price_cents >= minPrice);
    }
    if (maxPrice != null) {
      list = list.filter((c) => c.price_cents <= maxPrice);
    }
    if (minFollowers != null) {
      list = list.filter((c) => c.audience_size >= minFollowers);
    }
    if (maxFollowers != null) {
      list = list.filter((c) => c.audience_size <= maxFollowers);
    }
    const sort =
      (first(params.sort) as
        | "relevance"
        | "price_asc"
        | "price_desc"
        | "followers_desc"
        | undefined) ?? "followers_desc";
    if (sort === "price_asc") {
      list = [...list].sort((a, b) => a.price_cents - b.price_cents);
    } else if (sort === "price_desc") {
      list = [...list].sort((a, b) => b.price_cents - a.price_cents);
    } else {
      list = [...list].sort((a, b) => b.audience_size - a.audience_size);
    }
    creators = list;
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
      availability,
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
      (availability && availability !== "available") ||
      savedOnly,
  );

  const totalPages = Math.max(1, Math.ceil(total / 12));
  const preferredCampaignName = preferredCampaignId
    ? (eligibleCampaigns ?? []).find((c) => c.id === preferredCampaignId)
        ?.campaign_name
    : null;
  const resultSummary =
    error
      ? "Unable to load results"
      : total === 0
        ? hasFilters
          ? "No matching creators"
          : "No published creators yet"
        : savedOnly
          ? `${total} saved creator${total === 1 ? "" : "s"}`
          : total === creators.length
            ? `${total} creator${total === 1 ? "" : "s"}`
            : `Showing ${creators.length} of ${total} creators`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title={
          preferredCampaignName
            ? `Creators for ${preferredCampaignName}`
            : "The creator marketplace"
        }
        description={
          preferredCampaignName
            ? "Invitations from this page go to the selected campaign."
            : "Published LinkedIn creators with fixed per-post pricing."
        }
        actions={
          <Link
            href="/brand/shortlist"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors duration-150 hover:bg-page"
          >
            Shortlist
            <span className="tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">
              {savedIds.size}
            </span>
          </Link>
        }
      />

      <MarketplaceFilters
        searchParams={params}
        topics={topics}
        languages={languages}
        resultSummary={resultSummary}
      />

      {error ? (
        <EmptyState
          title="Could not load marketplace"
          description={error}
          action={
            <Link
              href="/brand/discover"
              className="text-sm font-semibold text-accent"
            >
              Try again
            </Link>
          }
        />
      ) : creators.length === 0 ? (
        <EmptyState
          title={
            savedOnly
              ? "No saved creators"
              : hasFilters
                ? "No creators match these filters"
                : "No published creators yet"
          }
          description={
            savedOnly
              ? "Save creators from the marketplace to build your shortlist."
              : hasFilters
                ? "Try clearing filters or broadening price and follower ranges."
                : "When creators publish their cards, they will appear here automatically."
          }
          action={
            savedOnly ? (
              <Link
                href="/brand/discover"
                className="text-sm font-semibold text-accent"
              >
                Browse marketplace
              </Link>
            ) : hasFilters ? (
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
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {creators.map((creator, index) => {
              const featured = index === 0 && page === 1 && !hasFilters;
              return (
                <li
                  key={creator.id}
                  className={`min-w-0 ${featured ? "sm:col-span-2 xl:col-span-3" : ""}`}
                >
                  <MarketplaceCreatorCard
                    creator={creator}
                    saved={savedIds.has(creator.id)}
                    campaigns={eligibleCampaigns ?? []}
                    preferredCampaignId={preferredCampaignId}
                    featured={featured}
                  />
                </li>
              );
            })}
          </ul>
          {!savedOnly && totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={buildPageHref(params, page - 1)}
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
                  href={buildPageHref(params, page + 1)}
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
