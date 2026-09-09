import type {
  CampaignCreator,
  CollaborationEvent,
  ContentSubmission,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_COLLAB_STATUSES,
  STATUS_LABEL,
  nextActionForStatus,
} from "@/lib/collaborations/status";

export {
  ACTIVE_COLLAB_STATUSES,
  STATUS_LABEL,
  nextActionForStatus,
};

export async function listCreatorCollaborations({
  creatorId,
  filter,
}: {
  creatorId: string;
  filter: "active" | "completed" | "cancelled" | "all";
}) {
  const supabase = await createClient();
  let query = supabase
    .from("campaign_creators")
    .select(
      "id,status,campaign_id,price_cents,currency,post_count_snapshot,accepted_at,updated_at,scheduled_publish_at,published_url,approved_at",
    )
    .eq("creator_id", creatorId)
    .not("status", "in", "(booking_pending,declined)")
    .order("updated_at", { ascending: false });

  if (filter === "active") {
    query = query.in("status", ACTIVE_COLLAB_STATUSES);
  } else if (filter === "completed") {
    query = query.eq("status", "completed");
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const { data: rows, error } = await query;
  if (error) return { items: [], error: error.message };

  const campaignIds = (rows ?? []).map((r) => r.campaign_id);
  const { data: campaigns } = campaignIds.length
    ? await supabase
        .from("campaigns")
        .select(
          "id,campaign_name,product_or_company,deliverable_type,target_publish_date,brand_id",
        )
        .in("id", campaignIds)
    : { data: [] as Array<{
        id: string;
        campaign_name: string;
        product_or_company: string;
        deliverable_type: string;
        target_publish_date: string;
        brand_id: string;
      }> };

  const brandIds = Array.from(new Set((campaigns ?? []).map((c) => c.brand_id)));
  const { data: brands } = brandIds.length
    ? await supabase.from("brands").select("id,company_name").in("id", brandIds)
    : { data: [] as Array<{ id: string; company_name: string }> };

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const brandById = new Map((brands ?? []).map((b) => [b.id, b]));

  return {
    items: (rows ?? []).map((row) => {
      const campaign = campaignById.get(row.campaign_id) ?? null;
      const brand = campaign ? brandById.get(campaign.brand_id) ?? null : null;
      return { ...row, campaign, brand };
    }),
    error: null as string | null,
  };
}

export async function listBrandCollaborations({
  brandId,
  filter,
}: {
  brandId: string;
  filter: "active" | "completed" | "cancelled" | "all" | "needs_review";
}) {
  const supabase = await createClient();
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id,campaign_name,product_or_company,deliverable_type,target_publish_date")
    .eq("brand_id", brandId);

  if (campErr) return { items: [], error: campErr.message };
  const campaignIds = (campaigns ?? []).map((c) => c.id);
  if (!campaignIds.length) return { items: [], error: null };

  let query = supabase
    .from("campaign_creators")
    .select(
      "id,status,campaign_id,creator_id,price_cents,currency,post_count_snapshot,accepted_at,updated_at,scheduled_publish_at,published_url",
    )
    .in("campaign_id", campaignIds)
    .not("status", "in", "(booking_pending,declined)")
    .order("updated_at", { ascending: false });

  if (filter === "active") query = query.in("status", ACTIVE_COLLAB_STATUSES);
  if (filter === "completed") query = query.eq("status", "completed");
  if (filter === "cancelled") query = query.eq("status", "cancelled");
  if (filter === "needs_review") {
    query = query.in("status", ["draft_submitted", "published", "approved"]);
  }

  const { data: rows, error } = await query;
  if (error) return { items: [], error: error.message };

  const creatorIds = (rows ?? []).map((r) => r.creator_id);
  const { data: creators } = creatorIds.length
    ? await supabase
        .from("creators")
        .select("id,slug,headline,profiles!creators_profile_id_fkey(full_name)")
        .in("id", creatorIds)
    : { data: [] as Array<{
        id: string;
        slug: string;
        headline: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
      }> };

  type CreatorJoin = {
    id: string;
    slug: string;
    headline: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  };

  const creatorById = new Map(
    ((creators ?? []) as unknown as CreatorJoin[]).map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return [
        c.id,
        {
          id: c.id,
          slug: c.slug,
          headline: c.headline,
          full_name: profile?.full_name ?? "Creator",
        },
      ];
    }),
  );

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));

  return {
    items: (rows ?? []).map((row) => ({
      ...row,
      campaign: campaignById.get(row.campaign_id) ?? null,
      creator: creatorById.get(row.creator_id) ?? null,
    })),
    error: null as string | null,
  };
}

export async function getCollaborationDetail(id: string) {
  const supabase = await createClient();
  const { data: collab, error } = await supabase
    .from("campaign_creators")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      collab: null as CampaignCreator | null,
      campaign: null,
      brand: null,
      creator: null,
      drafts: [] as ContentSubmission[],
      events: [] as CollaborationEvent[],
      error: error.message,
    };
  }
  if (!collab) {
    return {
      collab: null,
      campaign: null,
      brand: null,
      creator: null,
      drafts: [],
      events: [],
      error: null as string | null,
    };
  }

  const [{ data: campaign }, { data: drafts }, { data: events }] =
    await Promise.all([
      supabase.from("campaigns").select("*").eq("id", collab.campaign_id).maybeSingle(),
      supabase
        .from("content_submissions")
        .select("*")
        .eq("campaign_creator_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("collaboration_events")
        .select("*")
        .eq("campaign_creator_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const { data: brand } = campaign
    ? await supabase
        .from("brands")
        .select("id,company_name,website,industry,description")
        .eq("id", campaign.brand_id)
        .maybeSingle()
    : { data: null };

  const { data: creatorRow } = await supabase
    .from("creators")
    .select("id,slug,headline,profiles!creators_profile_id_fkey(full_name)")
    .eq("id", collab.creator_id)
    .maybeSingle();

  const profile = creatorRow
    ? Array.isArray(creatorRow.profiles)
      ? creatorRow.profiles[0]
      : creatorRow.profiles
    : null;

  return {
    collab: collab as CampaignCreator,
    campaign,
    brand,
    creator: creatorRow
      ? {
          id: creatorRow.id,
          slug: creatorRow.slug,
          headline: creatorRow.headline,
          full_name: (profile as { full_name?: string } | null)?.full_name ?? "Creator",
        }
      : null,
    drafts: (drafts ?? []) as ContentSubmission[],
    events: (events ?? []) as CollaborationEvent[],
    error: null as string | null,
  };
}
