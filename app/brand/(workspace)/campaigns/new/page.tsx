import Link from "next/link";

import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BrandCreateCampaignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const params = await searchParams;
  const inviteCreatorId = first(params.inviteCreatorId);

  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id,company_name")
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaigns"
        title="Create campaign"
        description="Write a clear brief. You can invite creators immediately or after saving."
        actions={
          <Link
            href="/brand/campaigns"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Back to campaigns
          </Link>
        }
      />

      <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <CampaignForm
          inviteCreatorId={inviteCreatorId}
          campaign={{
            product_or_company: brand.company_name,
            currency: "USD",
            post_count: 1,
            budget_cents: 0,
            status: "draft",
          }}
        />
      </div>
    </div>
  );
}
