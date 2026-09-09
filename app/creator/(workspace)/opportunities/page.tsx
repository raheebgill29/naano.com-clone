import Link from "next/link";

import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<
  Extract<CampaignCreatorStatus, "booking_pending" | "accepted" | "declined">,
  string
> = {
  booking_pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("creator");
  const params = await searchParams;
  const filter =
    (first(params.status) as
      | "booking_pending"
      | "accepted"
      | "declined"
      | "all"
      | undefined) ?? "all";

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
        description="Complete creator onboarding before reviewing opportunities."
      />
    );
  }

  const statuses: CampaignCreatorStatus[] =
    filter === "all"
      ? ["booking_pending", "accepted", "declined"]
      : [filter];

  const { data: rows, error } = await supabase
    .from("campaign_creators")
    .select(
      "id,status,campaign_id,price_cents,currency,post_count_snapshot,invited_at",
    )
    .eq("creator_id", creator.id)
    .in("status", statuses)
    .order("invited_at", { ascending: false });

  const campaignIds = (rows ?? []).map((r) => r.campaign_id);
  const { data: campaigns } = campaignIds.length
    ? await supabase
        .from("campaigns")
        .select(
          "id,campaign_name,product_or_company,deliverable_type,target_publish_date,brand_id",
        )
        .in("id", campaignIds)
    : { data: [] as Array<{
        id: string;
        campaign_name: string;
        product_or_company: string;
        deliverable_type: string;
        target_publish_date: string;
        brand_id: string;
      }> };

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

  const opportunities = (rows ?? []).map((row) => {
    const campaign = campaignById.get(row.campaign_id);
    const brand = campaign ? brandById.get(campaign.brand_id) : null;
    return { ...row, campaign, brand };
  });

  const { data: countRows } = await supabase
    .from("campaign_creators")
    .select("status")
    .eq("creator_id", creator.id)
    .in("status", ["booking_pending", "accepted", "declined"]);

  const counts = {
    booking_pending: 0,
    accepted: 0,
    declined: 0,
  };
  for (const row of countRows ?? []) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] += 1;
    }
  }

  const tabs = [
    {
      key: "all" as const,
      label: "All",
      count: counts.booking_pending + counts.accepted + counts.declined,
    },
    {
      key: "booking_pending" as const,
      label: "Pending",
      count: counts.booking_pending,
    },
    { key: "accepted" as const, label: "Accepted", count: counts.accepted },
    { key: "declined" as const, label: "Declined", count: counts.declined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Opportunities"
        description="Incoming booking requests and active briefs from brands."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          const href =
            tab.key === "all"
              ? "/creator/opportunities"
              : `/creator/opportunities?status=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-accent text-white"
                  : "border border-line bg-surface text-ink hover:bg-[#f7f8fa]"
              }`}
            >
              {tab.label} ({tab.count})
            </Link>
          );
        })}
      </div>

      {error ? (
        <EmptyState title="Could not load opportunities" description={error.message} />
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="When a brand invites you to a campaign, the request will show up here with the brief and next actions."
        />
      ) : (
        <ul className="space-y-3">
          {opportunities.map((opp) => (
            <li key={opp.id}>
              <Link
                href={`/creator/opportunities/${opp.id}`}
                className="block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] transition hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        {opp.campaign?.campaign_name ?? "Campaign"}
                      </h2>
                      <span className="rounded-full bg-[#f7f8fa] px-2 py-0.5 text-[11px] font-semibold text-support">
                        {STATUS_LABEL[
                          opp.status as keyof typeof STATUS_LABEL
                        ] ?? opp.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-support">
                      {opp.brand?.company_name ?? "Brand"} ·{" "}
                      {opp.campaign?.deliverable_type ?? "Deliverable"} · target{" "}
                      {opp.campaign
                        ? new Date(
                            opp.campaign.target_publish_date,
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatPriceCents(
                      opp.price_cents * opp.post_count_snapshot,
                      opp.currency,
                    )}
                    <span className="block text-[11px] font-normal text-ink-subtle">
                      snapshotted total
                    </span>
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
