import type { MarketplaceCreator } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type MarketplaceFilters = {
  q?: string;
  topic?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  minFollowers?: number;
  maxFollowers?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "followers_desc";
  page?: number;
  pageSize?: number;
};

const MARKETPLACE_SELECT = `
  id,
  slug,
  headline,
  bio,
  topics,
  audience_size,
  audience_summary,
  price_cents,
  currency,
  linkedin_url,
  location,
  languages,
  publication_status,
  availability,
  is_discoverable,
  profiles!creators_profile_id_fkey (
    full_name,
    avatar_url
  )
`;

type CreatorJoinRow = {
  id: string;
  slug: string;
  headline: string;
  bio: string | null;
  topics: string[];
  audience_size: number;
  audience_summary: string | null;
  price_cents: number;
  currency: string;
  linkedin_url: string | null;
  location: string | null;
  languages: string[];
  publication_status: "draft" | "published";
  availability: "available" | "unavailable";
  is_discoverable: boolean;
  profiles:
    | { full_name: string; avatar_url: string | null }
    | { full_name: string; avatar_url: string | null }[]
    | null;
};

function mapRow(row: CreatorJoinRow): MarketplaceCreator {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    bio: row.bio,
    topics: row.topics ?? [],
    audience_size: row.audience_size,
    audience_summary: row.audience_summary,
    price_cents: row.price_cents,
    currency: row.currency,
    linkedin_url: row.linkedin_url,
    location: row.location,
    languages: row.languages ?? [],
    publication_status: row.publication_status,
    availability: row.availability,
    is_discoverable: row.is_discoverable,
    full_name: profile?.full_name ?? "Creator",
    avatar_url: profile?.avatar_url ?? null,
  };
}

function matchesQuery(creator: MarketplaceCreator, q: string) {
  const needle = q.toLowerCase();
  return [creator.full_name, creator.headline, ...creator.topics]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function sortCreators(
  creators: MarketplaceCreator[],
  sort: MarketplaceFilters["sort"],
  q?: string,
) {
  const copy = [...creators];
  if (sort === "price_asc") {
    copy.sort((a, b) => a.price_cents - b.price_cents);
  } else if (sort === "price_desc") {
    copy.sort((a, b) => b.price_cents - a.price_cents);
  } else if (sort === "relevance" && q?.trim()) {
    const needle = q.trim().toLowerCase();
    copy.sort((a, b) => {
      const aScore = a.full_name.toLowerCase().includes(needle)
        ? 0
        : a.headline.toLowerCase().includes(needle)
          ? 1
          : 2;
      const bScore = b.full_name.toLowerCase().includes(needle)
        ? 0
        : b.headline.toLowerCase().includes(needle)
          ? 1
          : 2;
      if (aScore !== bScore) return aScore - bScore;
      return b.audience_size - a.audience_size;
    });
  } else {
    copy.sort((a, b) => b.audience_size - a.audience_size);
  }
  return copy;
}

export async function listMarketplaceCreators(filters: MarketplaceFilters = {}) {
  const pageSize = filters.pageSize ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const sort = filters.sort ?? (filters.q ? "relevance" : "followers_desc");

  const supabase = await createClient();

  let query = supabase
    .from("creators")
    .select(MARKETPLACE_SELECT)
    .eq("publication_status", "published")
    .eq("availability", "available");

  if (filters.topic) {
    query = query.contains("topics", [filters.topic]);
  }
  if (filters.language) {
    query = query.contains("languages", [filters.language]);
  }
  if (filters.minPrice != null) {
    query = query.gte("price_cents", filters.minPrice);
  }
  if (filters.maxPrice != null) {
    query = query.lte("price_cents", filters.maxPrice);
  }
  if (filters.minFollowers != null) {
    query = query.gte("audience_size", filters.minFollowers);
  }
  if (filters.maxFollowers != null) {
    query = query.lte("audience_size", filters.maxFollowers);
  }

  // Pull a bounded set so name/topic search can run against joined profile fields.
  const { data, error } = await query.limit(100);

  if (error) {
    return {
      creators: [] as MarketplaceCreator[],
      total: 0,
      error: error.message,
      page,
      pageSize,
    };
  }

  let creators = ((data ?? []) as unknown as CreatorJoinRow[]).map(mapRow);

  if (filters.q?.trim()) {
    creators = creators.filter((creator) =>
      matchesQuery(creator, filters.q!.trim()),
    );
  }

  creators = sortCreators(creators, sort, filters.q);
  const total = creators.length;
  const from = (page - 1) * pageSize;
  creators = creators.slice(from, from + pageSize);

  return {
    creators,
    total,
    error: null as string | null,
    page,
    pageSize,
  };
}

export async function getPublishedCreatorBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creators")
    .select(MARKETPLACE_SELECT)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) {
    return { creator: null, error: error.message };
  }
  if (!data) {
    return { creator: null, error: null };
  }

  return {
    creator: mapRow(data as unknown as CreatorJoinRow),
    error: null,
  };
}

export async function getSavedCreatorIds(brandId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_creators")
    .select("creator_id")
    .eq("brand_id", brandId);

  if (error) {
    return { ids: new Set<string>(), error: error.message };
  }

  return {
    ids: new Set((data ?? []).map((row) => row.creator_id)),
    error: null,
  };
}

export async function listSavedCreators(brandId: string) {
  const supabase = await createClient();
  const { data: saved, error: savedError } = await supabase
    .from("saved_creators")
    .select("creator_id, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (savedError) {
    return { creators: [] as MarketplaceCreator[], error: savedError.message };
  }

  const ids = (saved ?? []).map((row) => row.creator_id);
  if (ids.length === 0) {
    return { creators: [] as MarketplaceCreator[], error: null };
  }

  const { data, error } = await supabase
    .from("creators")
    .select(MARKETPLACE_SELECT)
    .in("id", ids)
    .eq("publication_status", "published");

  if (error) {
    return { creators: [] as MarketplaceCreator[], error: error.message };
  }

  const mapped = ((data ?? []) as unknown as CreatorJoinRow[]).map(mapRow);
  const order = new Map(ids.map((id, index) => [id, index]));
  mapped.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return { creators: mapped, error: null };
}
