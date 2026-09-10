import { CampaignsWorkspace } from "@/components/campaigns/campaigns-workspace";
import { PrimaryLink } from "@/components/ui/primitives";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { loadBrandCampaignList } from "@/lib/campaigns/list-queries";
import { createClient } from "@/lib/supabase/server";

export default async function BrandCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const params = await searchParams;

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
        description="Complete brand onboarding before creating campaigns."
      />
    );
  }

  const { items, error, loadedAtMs } = await loadBrandCampaignList(brand.id);
  const total = items.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campaigns"
        description={
          total > 0
            ? `${total} campaign${total === 1 ? "" : "s"} across draft, active, and completed work.`
            : "Create briefs, invite creators, and manage campaign lifecycle."
        }
        actions={
          <PrimaryLink href="/brand/campaigns/new" className="!w-auto">
            Create campaign
          </PrimaryLink>
        }
      />

      <CampaignsWorkspace
        key={[
          Array.isArray(params.q) ? params.q[0] : params.q,
          Array.isArray(params.status) ? params.status[0] : params.status,
          Array.isArray(params.sort) ? params.sort[0] : params.sort,
          Array.isArray(params.date) ? params.date[0] : params.date,
        ].join("|")}
        items={items}
        error={error}
        searchParams={params}
        loadedAtMs={loadedAtMs}
      />
    </div>
  );
}
