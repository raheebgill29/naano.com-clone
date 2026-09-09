import Link from "next/link";

import { EmptyState, PageHeader, formatPriceCents } from "@/components/workspace/ui";
import {
  CAMPAIGN_STATUS_LABEL,
  campaignStatusBadgeClass,
} from "@/lib/campaigns/status";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CampaignStatus } from "@/lib/supabase/database.types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ListFilter = CampaignStatus | "open";

export default async function BrandCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const params = await searchParams;
  const statusFilter = (first(params.status) as ListFilter | undefined) ?? "open";

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

  const { data: allCampaigns, error: countsError } = await supabase
    .from("campaigns")
    .select("id,status")
    .eq("brand_id", brand.id);

  const counts: Record<CampaignStatus, number> = {
    draft: 0,
    active: 0,
    paused: 0,
    completed: 0,
    archived: 0,
  };
  for (const row of allCampaigns ?? []) {
    counts[row.status as CampaignStatus] += 1;
  }
  const openCount = (allCampaigns ?? []).filter(
    (c) => c.status !== "archived",
  ).length;

  let listQuery = supabase
    .from("campaigns")
    .select(
      "id,campaign_name,status,product_or_company,budget_cents,currency,post_count,target_publish_date,created_at,updated_at",
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  if (statusFilter === "open") {
    listQuery = listQuery.neq("status", "archived");
  } else {
    listQuery = listQuery.eq("status", statusFilter);
  }

  const { data: campaigns, error } = await listQuery;

  const filters: Array<{
    key: ListFilter;
    label: string;
    count: number;
  }> = [
    { key: "open", label: "All", count: openCount },
    { key: "draft", label: "Draft", count: counts.draft },
    { key: "active", label: "Active", count: counts.active },
    { key: "paused", label: "Paused", count: counts.paused },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaigns"
        title="Campaigns"
        description="Create briefs, invite creators, and manage campaign lifecycle."
        actions={
          <Link
            href="/brand/campaigns/new"
            className="inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            Create campaign
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = statusFilter === filter.key;
          const href =
            filter.key === "open"
              ? "/brand/campaigns"
              : `/brand/campaigns?status=${filter.key}`;
          return (
            <Link
              key={filter.key}
              href={href}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                active
                  ? "bg-accent-soft text-accent"
                  : "border border-line bg-surface text-ink-muted hover:bg-page hover:text-ink"
              }`}
            >
              {filter.label} ({filter.count})
            </Link>
          );
        })}
      </div>

      {error || countsError ? (
        <EmptyState
          title="Could not load campaigns"
          description={error?.message || countsError?.message || "Unknown error"}
        />
      ) : (campaigns ?? []).length === 0 ? (
        <EmptyState
          title={
            statusFilter === "open"
              ? "No campaigns yet"
              : `No ${CAMPAIGN_STATUS_LABEL[statusFilter as CampaignStatus].toLowerCase()} campaigns`
          }
          description="Create a campaign brief, then invite published creators from the marketplace."
          action={
            <Link
              href="/brand/campaigns/new"
              className="text-sm font-semibold text-accent"
            >
              Create campaign
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {(campaigns ?? []).map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/brand/campaigns/${campaign.id}`}
                className="block rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[var(--shadow)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        {campaign.campaign_name}
                      </h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(campaign.status as CampaignStatus)}`}
                      >
                        {CAMPAIGN_STATUS_LABEL[campaign.status as CampaignStatus]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-support">
                      {campaign.product_or_company} · {campaign.post_count} post
                      {campaign.post_count === 1 ? "" : "s"} · target{" "}
                      {new Date(campaign.target_publish_date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatPriceCents(campaign.budget_cents, campaign.currency)}
                    <span className="block text-[11px] font-normal text-ink-subtle">
                      budget
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
