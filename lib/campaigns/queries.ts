import type { Campaign, CampaignCreatorStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type BrandCampaignCounts = Record<Campaign["status"], number>;

type CampaignSummary = {
  id: string;
  campaign_name: string;
  product_or_company: string;
  deliverable_type: string;
  target_publish_date: string;
  brand_id: string;
};

type BrandSummary = {
  id: string;
  company_name: string;
};

function reduceCounts(items: { status: Campaign["status"] }[]): BrandCampaignCounts {
  return {
    draft: items.filter((i) => i.status === "draft").length,
    active: items.filter((i) => i.status === "active").length,
    completed: items.filter((i) => i.status === "completed").length,
    archived: items.filter((i) => i.status === "archived").length,
  };
}

export async function getBrandCampaigns({
  brandId,
  status,
}: {
  brandId: string;
  status?: Campaign["status"] | "all";
}) {
  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select("id,status,campaign_name,created_at,updated_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return { campaigns: [], counts: reduceCounts([]), error: error.message };
  }

  const { data: allRows } = await supabase
    .from("campaigns")
    .select("status")
    .eq("brand_id", brandId);

  const counts = reduceCounts(allRows ?? []);

  return { campaigns: data ?? [], counts, error: null as string | null };
}

export async function getBrandCampaignDetail({
  brandId,
  campaignId,
}: {
  brandId: string;
  campaignId: string;
}) {
  const supabase = await createClient();

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (campaignErr) {
    return { campaign: null, invitations: [], error: campaignErr.message };
  }

  if (!campaign) {
    return { campaign: null, invitations: [], error: null as string | null };
  }

  const { data: invites, error: invitesErr } = await supabase
    .from("campaign_creators")
    .select(
      "id,status,creator_id,price_cents,currency,post_count_snapshot,decline_reason,invited_at,accepted_at,declined_at,cancelled_at",
    )
    .eq("campaign_id", campaignId)
    .order("invited_at", { ascending: false });

  if (invitesErr) {
    return { campaign, invitations: [], error: invitesErr.message };
  }

  const creatorIds = (invites ?? []).map((i) => i.creator_id);
  const { data: creators } = creatorIds.length
    ? await supabase
        .from("creators")
        .select("id,slug,headline,topics,audience_size,audience_summary")
        .in("id", creatorIds)
    : { data: [] as Array<{
        id: string;
        slug: string;
        headline: string;
        topics: string[];
        audience_size: number;
        audience_summary: string | null;
      }> };

  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));

  const invitations = (invites ?? []).map((inv) => ({
    ...inv,
    creator: creatorById.get(inv.creator_id) ?? null,
  }));

  return { campaign: campaign as Campaign, invitations, error: null as string | null };
}

export async function getCreatorOpportunities({
  creatorId,
  statuses,
}: {
  creatorId: string;
  statuses: CampaignCreatorStatus[];
}) {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("campaign_creators")
    .select(
      "id,status,campaign_id,price_cents,currency,post_count_snapshot,decline_reason,invited_at,accepted_at,declined_at,cancelled_at",
    )
    .eq("creator_id", creatorId)
    .in("status", statuses)
    .order("invited_at", { ascending: false });

  if (error) {
    return { opportunities: [], error: error.message };
  }

  const campaignIds = (rows ?? []).map((r) => r.campaign_id);
  const { data: campaigns } = campaignIds.length
    ? await supabase
        .from("campaigns")
        .select(
          "id,campaign_name,product_or_company,deliverable_type,target_publish_date,brand_id,objective,description,key_messages,creator_guidelines,post_count",
        )
        .in("id", campaignIds)
    : { data: [] as CampaignSummary[] };

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const brandIds = Array.from(
    new Set((campaigns ?? []).map((c) => c.brand_id)),
  );

  const { data: brands } = brandIds.length
    ? await supabase
        .from("brands")
        .select("id,company_name")
        .in("id", brandIds)
    : { data: [] as BrandSummary[] };

  const brandById = new Map((brands ?? []).map((b) => [b.id, b]));

  const opportunities = (rows ?? []).map((r) => {
    const campaign = campaignById.get(r.campaign_id);
    const brand = campaign ? brandById.get(campaign.brand_id) : null;
    return {
      ...r,
      campaign,
      brand,
    };
  });

  return { opportunities, error: null as string | null };
}
