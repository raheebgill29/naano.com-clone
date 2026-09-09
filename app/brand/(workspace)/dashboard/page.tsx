import { BrandOverview } from "@/components/brand/overview";
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
    creatorsBooked: 0,
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
      const { data: invites } = await supabase
        .from("campaign_creators")
        .select("status")
        .in("campaign_id", campaignIds);

      metrics.creatorsBooked = (invites ?? []).filter(
        (i) => i.status === "accepted",
      ).length;
      metrics.pendingInvites = (invites ?? []).filter(
        (i) => i.status === "booking_pending",
      ).length;
    }
  }

  return <BrandOverview profile={profile} brand={brand} metrics={metrics} />;
}
