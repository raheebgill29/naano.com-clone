import { notFound } from "next/navigation";

import { CampaignDetailWorkspace } from "@/components/campaigns/campaign-detail-workspace";
import { EmptyState } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { loadBrandCampaignDetail } from "@/lib/campaigns/detail-queries";
import { createClient } from "@/lib/supabase/server";

export default async function BrandCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const { id } = await params;
  const query = await searchParams;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

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
        description="Complete brand onboarding before managing campaigns."
      />
    );
  }

  const {
    campaign,
    invitations,
    activity,
    stats,
    committedCostCents,
    error,
    inviteError,
    loadedAtMs,
  } = await loadBrandCampaignDetail(brand.id, id);

  if (error) {
    return (
      <EmptyState title="Could not load campaign" description={error} />
    );
  }
  if (!campaign) {
    notFound();
  }

  return (
    <CampaignDetailWorkspace
      key={Array.isArray(query.tab) ? query.tab[0] : query.tab}
      campaign={campaign}
      invitations={invitations}
      activity={activity}
      stats={stats}
      committedCostCents={committedCostCents}
      inviteError={inviteError}
      searchParams={query}
      loadedAtMs={loadedAtMs}
    />
  );
}
