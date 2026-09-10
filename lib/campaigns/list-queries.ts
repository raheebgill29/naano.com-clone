import {
  computeCampaignStats,
  type CampaignListItem,
} from "@/lib/campaigns/list-data";
import type { CampaignStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function loadBrandCampaignList(
  brandId: string,
): Promise<{
  items: CampaignListItem[];
  error: string | null;
  loadedAtMs: number;
}> {
  const supabase = await createClient();
  const loadedAtMs = Date.now();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      "id,campaign_name,status,product_or_company,objective,budget_cents,currency,post_count,target_publish_date,created_at,updated_at",
    )
    .eq("brand_id", brandId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message, loadedAtMs };
  }

  const rows = campaigns ?? [];
  const ids = rows.map((c) => c.id);
  if (!ids.length) {
    return { items: [], error: null, loadedAtMs };
  }

  const { data: invites, error: inviteError } = await supabase
    .from("campaign_creators")
    .select("id,campaign_id,status,price_cents,post_count_snapshot")
    .in("campaign_id", ids);

  if (inviteError) {
    return { items: [], error: inviteError.message, loadedAtMs };
  }

  const byCampaign = new Map<
    string,
    Array<{
      id: string;
      status: string;
      price_cents: number;
      post_count_snapshot: number;
    }>
  >();

  for (const inv of invites ?? []) {
    const list = byCampaign.get(inv.campaign_id) ?? [];
    list.push({
      id: inv.id,
      status: inv.status,
      price_cents: inv.price_cents,
      post_count_snapshot: inv.post_count_snapshot,
    });
    byCampaign.set(inv.campaign_id, list);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const items: CampaignListItem[] = rows.map((campaign) => {
    const invitationRows = byCampaign.get(campaign.id) ?? [];
    const targetMs = new Date(campaign.target_publish_date).getTime();
    return {
      id: campaign.id,
      campaign_name: campaign.campaign_name,
      status: campaign.status as CampaignStatus,
      product_or_company: campaign.product_or_company,
      objective: campaign.objective,
      budget_cents: campaign.budget_cents,
      currency: campaign.currency,
      post_count: campaign.post_count,
      target_publish_date: campaign.target_publish_date,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      stats: computeCampaignStats(invitationRows),
      invitationStatuses: invitationRows.map((i) => ({
        id: i.id,
        status: i.status,
      })),
      isOverdue:
        campaign.status !== "completed" &&
        campaign.status !== "archived" &&
        targetMs < loadedAtMs,
      isUpcoming30d:
        targetMs >= loadedAtMs && targetMs <= loadedAtMs + 30 * dayMs,
    };
  });

  return { items, error: null, loadedAtMs };
}
