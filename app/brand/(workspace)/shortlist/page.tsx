import Link from "next/link";

import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import { InviteToCampaignForm } from "@/components/campaigns/InviteToCampaignForm";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
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

  const { creators, error } = await listSavedCreators(brand.id);
  const { data: eligibleCampaigns } = await supabase
    .from("campaigns")
    .select("id,campaign_name,status")
    .eq("brand_id", brand.id)
    .in("status", ["draft", "active"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shortlist"
        title="Saved creators"
        description="Creators you saved from the marketplace."
        actions={
          <Link
            href="/brand/discover"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Explore marketplace
          </Link>
        }
      />

      {error ? (
        <EmptyState title="Could not load shortlist" description={error} />
      ) : creators.length === 0 ? (
        <EmptyState
          title="No saved creators yet"
          description="Browse the marketplace and save creators you want to revisit for campaigns."
          action={
            <Link
              href="/brand/discover"
              className="text-sm font-semibold text-accent"
            >
              Go to marketplace
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {creators.map((creator) => (
            <li key={creator.id}>
              <CreatorPublicCard
                compact
                creator={creator}
                href={`/brand/creators/${creator.slug}`}
                actions={
                  <div className="space-y-3">
                    <SaveCreatorButton creatorId={creator.id} initiallySaved />
          <InviteToCampaignForm
                      creatorId={creator.id}
                      campaigns={eligibleCampaigns ?? []}
                      creator={{
                        full_name: creator.full_name,
                        headline: creator.headline,
                        price_cents: creator.price_cents,
                        currency: creator.currency,
                      }}
                    />
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
