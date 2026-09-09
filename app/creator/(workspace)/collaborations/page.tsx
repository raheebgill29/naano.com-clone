import Link from "next/link";

import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorCollaborationsPage() {
  const { userId } = await requireRole("creator");
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!creator) {
    return (
      <EmptyState
        title="Creator profile missing"
        description="Complete creator onboarding before tracking collaborations."
      />
    );
  }

  const { data: rows, error } = await supabase
    .from("campaign_creators")
    .select(
      "id,status,campaign_id,price_cents,currency,post_count_snapshot,accepted_at",
    )
    .eq("creator_id", creator.id)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false });

  const campaignIds = (rows ?? []).map((r) => r.campaign_id);
  const { data: campaigns } = campaignIds.length
    ? await supabase
        .from("campaigns")
        .select("id,campaign_name,product_or_company,deliverable_type,brand_id")
        .in("id", campaignIds)
    : {
        data: [] as Array<{
          id: string;
          campaign_name: string;
          product_or_company: string;
          deliverable_type: string;
          brand_id: string;
        }>,
      };

  const brandIds = Array.from(
    new Set((campaigns ?? []).map((c) => c.brand_id)),
  );
  const { data: brands } = brandIds.length
    ? await supabase
        .from("brands")
        .select("id,company_name")
        .in("id", brandIds)
    : { data: [] as Array<{ id: string; company_name: string }> };

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const brandById = new Map((brands ?? []).map((b) => [b.id, b]));

  const collaborations = (rows ?? []).map((row) => {
    const campaign = campaignById.get(row.campaign_id);
    const brand = campaign ? brandById.get(campaign.brand_id) : null;
    return { ...row, campaign, brand };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborations"
        title="Collaborations"
        description="Accepted opportunities start here. Draft submission and publication tracking come later."
      />

      {error ? (
        <EmptyState
          title="Could not load collaborations"
          description={error.message}
        />
      ) : collaborations.length === 0 ? (
        <EmptyState
          title="No collaborations in progress"
          description="Accepted opportunities will move here so you can track booked work."
          action={
            <Link
              href="/creator/opportunities"
              className="text-sm font-semibold text-accent"
            >
              View opportunities
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {collaborations.map((item) => (
            <li key={item.id}>
              <Link
                href={`/creator/opportunities/${item.id}`}
                className="block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] transition hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {item.campaign?.campaign_name ?? "Campaign"}
                    </h2>
                    <p className="mt-1 text-sm text-support">
                      {item.brand?.company_name ?? "Brand"} ·{" "}
                      {item.campaign?.deliverable_type ?? "Deliverable"} ·
                      accepted{" "}
                      {item.accepted_at
                        ? new Date(item.accepted_at).toLocaleDateString()
                        : "—"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-success">
                      Status: accepted
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatPriceCents(
                      item.price_cents * item.post_count_snapshot,
                      item.currency,
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
