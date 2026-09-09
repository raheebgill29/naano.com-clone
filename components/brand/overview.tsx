import Link from "next/link";

import { PrimaryLink, SecondaryLink } from "@/components/ui/primitives";
import { PageHeader } from "@/components/workspace/ui";
import type { Brand, Profile } from "@/lib/supabase/database.types";

export function BrandOverview({
  profile,
  brand,
  metrics,
}: {
  profile: Profile;
  brand: Brand | null;
  metrics?: {
    activeCampaigns: number;
    activeCollaborations: number;
    draftsAwaitingReview: number;
    completedCollaborations: number;
    pendingInvites: number;
    unreadMessages?: number;
  };
}) {
  const company = brand?.company_name || "your brand";
  const activeCampaigns = metrics?.activeCampaigns ?? 0;
  const activeCollaborations = metrics?.activeCollaborations ?? 0;
  const draftsAwaitingReview = metrics?.draftsAwaitingReview ?? 0;
  const completedCollaborations = metrics?.completedCollaborations ?? 0;
  const pendingInvites = metrics?.pendingInvites ?? 0;
  const unreadMessages = metrics?.unreadMessages ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Brand workspace"
        title={`Welcome, ${profile.full_name.split(/\s+/)[0] || profile.full_name}`}
        description={`Manage discovery and campaigns for ${company}. Counts reflect real invitations and collaborations only.`}
        actions={
          <>
            <PrimaryLink href="/brand/discover" className="!w-auto">
              Explore creators
            </PrimaryLink>
            <SecondaryLink href="/brand/campaigns/new" className="!w-auto">
              Create campaign
            </SecondaryLink>
          </>
        }
      />

      <section
        aria-label="Campaign metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric label="Active campaigns" value={String(activeCampaigns)} />
        <Metric
          label="Active collaborations"
          value={String(activeCollaborations)}
          href="/brand/collaborations"
        />
        <Metric
          label="Drafts awaiting review"
          value={String(draftsAwaitingReview)}
          href="/brand/collaborations?filter=needs_review"
        />
        <Metric
          label="Completed collaborations"
          value={String(completedCollaborations)}
          href="/brand/collaborations?filter=completed"
        />
      </section>

      <p className="text-sm text-support">
        Pending invitations:{" "}
        <Link
          href="/brand/campaigns"
          className="font-semibold text-accent hover:text-accent-hover"
        >
          {pendingInvites}
        </Link>
        {" · "}
        Unread messages:{" "}
        <Link
          href="/brand/messages"
          className="font-semibold text-accent hover:text-accent-hover"
        >
          {unreadMessages}
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Company profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-ink-subtle">Company</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {brand?.company_name || "—"}
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
                    className="font-medium text-accent hover:text-accent-hover"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {brand.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Next steps</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-lg border border-line px-3 py-3">
              <p className="font-medium text-ink">Explore the marketplace</p>
              <p className="mt-1 text-support">
                Browse creator profiles with fixed per-post pricing.
              </p>
              <Link
                href="/brand/discover"
                className="mt-2 inline-block font-semibold text-accent hover:text-accent-hover"
              >
                Open marketplace
              </Link>
            </li>
            <li className="rounded-lg border border-line px-3 py-3">
              <p className="font-medium text-ink">Review collaborations</p>
              <p className="mt-1 text-support">
                Approve drafts, schedule posts, and mark work complete.
              </p>
              <Link
                href="/brand/collaborations"
                className="mt-2 inline-block font-semibold text-accent hover:text-accent-hover"
              >
                Open collaborations
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
        <h2 className="text-base font-semibold text-ink">
          {activeCampaigns +
            activeCollaborations +
            draftsAwaitingReview +
            completedCollaborations +
            pendingInvites ===
          0
            ? "No campaign activity yet"
            : "Campaign activity started"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-support">
          Reach, engagement, and lead analytics stay empty until real published
          performance data exists. We will not invent demo metrics here.
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <p className="text-sm font-medium text-support">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
    </article>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
