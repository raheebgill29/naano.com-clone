import { ShortlistWorkspace } from "@/components/marketplace/shortlist-workspace";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { PrimaryLink } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth/session";
import { listSavedCreators } from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BrandShortlistPage() {
  const { userId } = await requireRole("brand");
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
        description="Complete brand onboarding before managing a shortlist."
      />
    );
  }

  const [{ creators, error }, { data: eligibleCampaigns }] = await Promise.all([
    listSavedCreators(brand.id),
    supabase
      .from("campaigns")
      .select("id,campaign_name,status")
      .eq("brand_id", brand.id)
      .in("status", ["draft", "active"]),
  ]);

  const count = creators.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shortlist"
        description={
          count > 0
            ? `${count} saved creator${count === 1 ? "" : "s"}`
            : "Save creators from Discover to compare and invite."
        }
        actions={
          <PrimaryLink href="/brand/discover" className="!w-auto">
            Browse creators
          </PrimaryLink>
        }
      />

      <ShortlistWorkspace
        creators={creators}
        campaigns={eligibleCampaigns ?? []}
        error={error}
      />
    </div>
  );
}
