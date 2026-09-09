import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/campaigns/ConfirmButton";
import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import {
  acceptOpportunity,
  declineOpportunity,
} from "@/lib/campaigns/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireRole("creator");
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

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

  const { data: invitation, error } = await supabase
    .from("campaign_creators")
    .select("*")
    .eq("id", id)
    .eq("creator_id", creator.id)
    .maybeSingle();

  if (error) {
    return (
      <EmptyState title="Could not load opportunity" description={error.message} />
    );
  }
  if (!invitation) {
    notFound();
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", invitation.campaign_id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id,company_name,website,industry,description")
    .eq("id", campaign.brand_id)
    .maybeSingle();

  const total = invitation.price_cents * invitation.post_count_snapshot;
  const pending = invitation.status === "booking_pending";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunity"
        title={campaign.campaign_name}
        description={`${brand?.company_name ?? "Brand"} · ${invitation.status}`}
        actions={
          <Link
            href="/creator/opportunities"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Back to opportunities
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Snapshotted rate</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(invitation.price_cents, invitation.currency)}
            <span className="text-sm font-normal text-ink-subtle"> / post</span>
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Agreed posts</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {invitation.post_count_snapshot}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Total compensation</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(total, invitation.currency)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Brand</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">Company</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {brand?.company_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Industry</dt>
            <dd className="mt-0.5 text-ink">{brand?.industry || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Website</dt>
            <dd className="mt-0.5 text-ink">
              {brand?.website ? (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent hover:text-accent-hover"
                >
                  {brand.website}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {brand?.description ? (
            <div className="sm:col-span-2">
              <dt className="text-ink-subtle">About</dt>
              <dd className="mt-0.5 text-ink">{brand.description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Campaign brief</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">Product / company</dt>
            <dd className="mt-0.5 text-ink">{campaign.product_or_company}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Objective</dt>
            <dd className="mt-0.5 text-ink">{campaign.objective}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Deliverable</dt>
            <dd className="mt-0.5 text-ink">{campaign.deliverable_type}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Target publish date</dt>
            <dd className="mt-0.5 text-ink">
              {new Date(campaign.target_publish_date).toLocaleDateString()}
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
        </dl>
        <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-[#f7f8fa] px-3 py-2 text-xs text-support">
          Compensation and brief details are read-only. Price changes on your
          creator card do not affect this invitation snapshot.
        </p>
      </section>

      {pending ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Respond</h2>
          <p className="mt-1 text-sm text-support">
            Accept to move this into Collaborations, or decline with
            confirmation.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form action={acceptOpportunity}>
              <input
                type="hidden"
                name="campaign_creator_id"
                value={invitation.id}
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Accept invitation
              </button>
            </form>
            <form action={declineOpportunity} className="space-y-2">
              <input
                type="hidden"
                name="campaign_creator_id"
                value={invitation.id}
              />
              <label className="block text-xs font-medium text-support">
                Optional decline note
                <input
                  name="decline_reason"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                  placeholder="Not a fit this month"
                />
              </label>
              <ConfirmButton confirmText="Decline this opportunity? This cannot be undone.">
                Decline invitation
              </ConfirmButton>
            </form>
          </div>
        </section>
      ) : invitation.status === "accepted" ||
        [
          "draft_submitted",
          "revision_requested",
          "approved",
          "scheduled",
          "published",
          "completed",
          "cancelled",
        ].includes(invitation.status) ? (
        <EmptyState
          title={
            invitation.status === "accepted"
              ? "Invitation accepted"
              : "Handled in Collaborations"
          }
          description="Continue this work from the collaboration detail page."
          action={
            <Link
              href={`/creator/collaborations/${invitation.id}`}
              className="text-sm font-semibold text-accent"
            >
              Open collaboration
            </Link>
          }
        />
      ) : invitation.status === "declined" ? (
        <EmptyState
          title="Invitation declined"
          description={
            invitation.decline_reason
              ? `Note: ${invitation.decline_reason}`
              : "You declined this opportunity."
          }
        />
      ) : (
        <EmptyState
          title="Invitation withdrawn"
          description="The brand withdrew this pending invitation."
        />
      )}
    </div>
  );
}
