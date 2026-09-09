import Link from "next/link";

import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import {
  STATUS_LABEL,
  listBrandCollaborations,
  nextActionForStatus,
} from "@/lib/collaborations/queries";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BrandCollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("brand");
  const params = await searchParams;
  const filter =
    (first(params.filter) as
      | "active"
      | "completed"
      | "cancelled"
      | "all"
      | "needs_review") || "active";

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
        description="Complete brand onboarding before managing collaborations."
      />
    );
  }

  const { items, error } = await listBrandCollaborations({
    brandId: brand.id,
    filter,
  });

  const tabs = [
    { key: "active", label: "Active" },
    { key: "needs_review", label: "Needs action" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborations"
        title="Collaborations"
        description="Review drafts, schedule posts, and complete booked creator work."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "active"
                ? "/brand/collaborations"
                : `/brand/collaborations?filter=${tab.key}`
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
          title="No collaborations yet"
          description="Invite creators from a campaign. Accepted invitations appear here for review."
          action={
            <Link
              href="/brand/campaigns"
              className="text-sm font-semibold text-accent"
            >
              Open campaigns
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/brand/collaborations/${item.id}`}
                className="block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] transition hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        {item.creator?.full_name ?? "Creator"}
                      </h2>
                      <span className="rounded-full bg-[#f7f8fa] px-2 py-0.5 text-[11px] font-semibold text-support">
                        {STATUS_LABEL[item.status as CampaignCreatorStatus]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-support">
                      {item.campaign?.campaign_name ?? "Campaign"} · target{" "}
                      {item.campaign
                        ? new Date(
                            item.campaign.target_publish_date,
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      Next:{" "}
                      {nextActionForStatus(
                        item.status as CampaignCreatorStatus,
                        "brand",
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
