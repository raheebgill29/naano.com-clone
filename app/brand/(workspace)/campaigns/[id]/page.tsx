import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/campaigns/ConfirmButton";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { archiveCampaign, withdrawInvitation } from "@/lib/campaigns/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

const INVITE_LABEL: Record<CampaignCreatorStatus, string> = {
  booking_pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Withdrawn",
};

export default async function BrandCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireRole("brand");
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

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
        description="Complete brand onboarding before managing campaigns."
      />
    );
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("brand_id", brand.id)
    .maybeSingle();

  if (error) {
    return <EmptyState title="Could not load campaign" description={error.message} />;
  }
  if (!campaign) {
    notFound();
  }

  const { data: invites, error: inviteError } = await supabase
    .from("campaign_creators")
    .select(
      "id,status,creator_id,price_cents,currency,post_count_snapshot,decline_reason,invited_at,accepted_at,declined_at,cancelled_at",
    )
    .eq("campaign_id", campaign.id)
    .order("invited_at", { ascending: false });

  const creatorIds = (invites ?? []).map((i) => i.creator_id);
  const { data: creators } = creatorIds.length
    ? await supabase
        .from("creators")
        .select("id,slug,headline,profiles!creators_profile_id_fkey(full_name)")
        .in("id", creatorIds)
    : { data: [] as Array<{ id: string; slug: string; headline: string; profiles: unknown }> };

  type CreatorJoin = {
    id: string;
    slug: string;
    headline: string;
    profiles:
      | { full_name: string }
      | { full_name: string }[]
      | null;
  };

  const creatorById = new Map(
    ((creators ?? []) as unknown as CreatorJoin[]).map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return [
        c.id,
        {
          id: c.id,
          slug: c.slug,
          headline: c.headline,
          full_name: profile?.full_name ?? "Creator",
        },
      ];
    }),
  );

  const invitations = (invites ?? []).map((inv) => ({
    ...inv,
    creator: creatorById.get(inv.creator_id) ?? null,
  }));

  const potentialCost = invitations
    .filter((i) => i.status === "booking_pending" || i.status === "accepted")
    .reduce((sum, i) => sum + i.price_cents * i.post_count_snapshot, 0);

  const committedCost = invitations
    .filter((i) => i.status === "accepted")
    .reduce((sum, i) => sum + i.price_cents * i.post_count_snapshot, 0);

  const canEdit = campaign.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaign detail"
        title={campaign.campaign_name}
        description={`${campaign.product_or_company} · ${campaign.status}`}
        actions={
          <Link
            href="/brand/campaigns"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Back to campaigns
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Budget</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(campaign.budget_cents, campaign.currency)}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Potential cost</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(potentialCost, campaign.currency)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">Pending + accepted snapshots</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Committed cost</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(committedCost, campaign.currency)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">Accepted invitations only</p>
        </article>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Brief</h2>
        {canEdit ? (
          <div className="mt-4">
            <CampaignForm campaign={campaign} campaignId={campaign.id} />
            <form action={archiveCampaign} className="mt-4 max-w-xs">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <ConfirmButton confirmText="Archive this draft and withdraw pending invitations?">
                Archive draft
              </ConfirmButton>
            </form>
          </div>
        ) : (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-subtle">Objective</dt>
              <dd className="mt-0.5 text-ink">{campaign.objective}</dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Deliverable</dt>
              <dd className="mt-0.5 text-ink">
                {campaign.deliverable_type} · {campaign.post_count} post
                {campaign.post_count === 1 ? "" : "s"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-subtle">Description</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-ink">
                {campaign.description}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-subtle">Key messages</dt>
              <dd className="mt-0.5 text-ink">
                <ul className="list-disc space-y-1 pl-5">
                  {(campaign.key_messages ?? []).map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-subtle">Creator guidelines</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-ink">
                {campaign.creator_guidelines}
              </dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Target publish date</dt>
              <dd className="mt-0.5 text-ink">
                {new Date(campaign.target_publish_date).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Invited creators</h2>
          <Link
            href="/brand/discover"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Invite from marketplace
          </Link>
        </div>

        {inviteError ? (
          <p className="mt-4 text-sm text-danger">{inviteError.message}</p>
        ) : invitations.length === 0 ? (
          <p className="mt-4 text-sm text-support">
            No creators invited yet. Open marketplace or shortlist and use Invite
            to campaign.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="rounded-lg border border-line px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {inv.creator?.full_name ?? "Creator"}
                    </p>
                    <p className="mt-0.5 text-xs text-support">
                      {inv.creator?.headline ?? "—"}
                    </p>
                    <p className="mt-2 text-xs text-support">
                      Snapshot:{" "}
                      {formatPriceCents(inv.price_cents, inv.currency)} ×{" "}
                      {inv.post_count_snapshot} ={" "}
                      {formatPriceCents(
                        inv.price_cents * inv.post_count_snapshot,
                        inv.currency,
                      )}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink">
                      {INVITE_LABEL[inv.status]}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {inv.creator?.slug ? (
                      <Link
                        href={`/brand/creators/${inv.creator.slug}`}
                        className="text-xs font-semibold text-accent"
                      >
                        View card
                      </Link>
                    ) : null}
                    {inv.status === "booking_pending" ? (
                      <form action={withdrawInvitation}>
                        <input
                          type="hidden"
                          name="campaign_creator_id"
                          value={inv.id}
                        />
                        <ConfirmButton confirmText="Withdraw this pending invitation?">
                          Withdraw
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
