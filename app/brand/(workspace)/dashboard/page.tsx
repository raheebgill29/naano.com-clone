import { BrandOverview } from "@/components/brand/overview";
import { ACTIVE_COLLAB_STATUSES } from "@/lib/collaborations/queries";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function BrandDashboardPage() {
  const { profile, userId } = await requireRole("brand");
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  const metrics = {
    activeCampaigns: 0,
    activeCollaborations: 0,
    draftsAwaitingReview: 0,
    completedCollaborations: 0,
    pendingInvites: 0,
  };

  if (brand) {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id,status")
      .eq("brand_id", brand.id);

    metrics.activeCampaigns = (campaigns ?? []).filter(
      (c) => c.status === "active",
    ).length;

    const campaignIds = (campaigns ?? []).map((c) => c.id);
    if (campaignIds.length) {
      const { data: rows } = await supabase
        .from("campaign_creators")
        .select("status")
        .in("campaign_id", campaignIds);

      metrics.pendingInvites = (rows ?? []).filter(
        (i) => i.status === "booking_pending",
      ).length;
      metrics.activeCollaborations = (rows ?? []).filter((i) =>
        ACTIVE_COLLAB_STATUSES.includes(i.status),
      ).length;
      metrics.draftsAwaitingReview = (rows ?? []).filter(
        (i) => i.status === "draft_submitted",
      ).length;
      metrics.completedCollaborations = (rows ?? []).filter(
        (i) => i.status === "completed",
      ).length;
    }
  }

  return <BrandOverview profile={profile} brand={brand} metrics={metrics} />;
}
