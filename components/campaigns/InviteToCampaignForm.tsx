"use client";

import {
  inviteCreatorToCampaign,
  type InviteActionState,
} from "@/lib/campaigns/actions";
import type { CampaignStatus } from "@/lib/supabase/database.types";

import { InviteToCampaignButton } from "@/components/marketplace/invite-dialog";

export type { InviteActionState };
export { inviteCreatorToCampaign };

/**
 * Marketplace invite entry point — opens the focused invite dialog.
 * Prefer passing creator summary for a richer modal snapshot.
 */
export function InviteToCampaignForm({
  creatorId,
  campaigns,
  creator,
}: {
  creatorId: string;
  campaigns: Array<{
    id: string;
    campaign_name: string;
    status: CampaignStatus;
  }>;
  creator?: {
    full_name: string;
    headline: string;
    price_cents: number;
    currency: string;
  };
}) {
  return (
    <InviteToCampaignButton
      creator={{
        id: creatorId,
        full_name: creator?.full_name ?? "Creator",
        headline: creator?.headline ?? "",
        price_cents: creator?.price_cents ?? 0,
        currency: creator?.currency ?? "USD",
      }}
      campaigns={campaigns}
      className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
    />
  );
}
