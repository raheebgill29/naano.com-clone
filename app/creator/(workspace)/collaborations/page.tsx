import Link from "next/link";

import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import {
  CAMPAIGN_STATUS_LABEL,
  campaignStatusBadgeClass,
} from "@/lib/campaigns/status";
import {
  STATUS_LABEL,
  listCreatorCollaborations,
  nextActionForStatus,
} from "@/lib/collaborations/queries";
import type {
  CampaignCreatorStatus,
  CampaignStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorCollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("creator");
  const params = await searchParams;
  const filter =
    (first(params.filter) as "active" | "completed" | "cancelled" | "all") ||
    "active";

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

  const { items, error } = await listCreatorCollaborations({
    creatorId: creator.id,
    filter,
  });

  const tabs = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborations"
        title="Collaborations"
        description="Accepted work from draft through published posts."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "active"
                ? "/creator/collaborations"
                : `/creator/collaborations?filter=${tab.key}`
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === tab.key
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink hover:bg-[#f7f8fa]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <EmptyState title="Could not load collaborations" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No collaborations here"
          description="Accepted invitations appear here so you can submit drafts and published URLs."
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
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/creator/collaborations/${item.id}`}
                className="block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] transition hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        {item.campaign?.campaign_name ?? "Campaign"}
                      </h2>
                      <span className="rounded-full bg-[#f7f8fa] px-2 py-0.5 text-[11px] font-semibold text-support">
                        {STATUS_LABEL[item.status as CampaignCreatorStatus]}
                      </span>
                      {item.campaign &&
                      "status" in item.campaign &&
                      item.campaign.status ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(item.campaign.status as CampaignStatus)}`}
                        >
                          Campaign{" "}
                          {
                            CAMPAIGN_STATUS_LABEL[
                              item.campaign.status as CampaignStatus
                            ]
                          }
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-support">
                      {item.brand?.company_name ?? "Brand"} ·{" "}
                      {item.campaign?.deliverable_type ?? "Deliverable"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      Next:{" "}
                      {nextActionForStatus(
                        item.status as CampaignCreatorStatus,
                        "creator",
                      )}
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
