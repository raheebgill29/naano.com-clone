"use client";

import Link from "next/link";

import { PrimaryLink, SecondaryLink } from "@/components/ui/primitives";
import {
  PageHeader,
  formatCount,
  formatPriceCents,
  initials,
} from "@/components/workspace/ui";
import { appToast } from "@/lib/toast";
import type { Creator, Profile } from "@/lib/supabase/database.types";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export function CreatorCardActions({ cardPath }: { cardPath: string }) {
  async function copyLink() {
    try {
      const url = new URL(cardPath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      appToast.success({
        title: "Card link copied",
        description: "The link is ready to paste.",
        id: "creator-card-copy",
      });
    } catch {
      appToast.error({
        title: "Could not copy the link",
        description: "Try again in a moment.",
        id: "creator-card-copy-error",
      });
    }
  }

  async function shareCard() {
    const url = new URL(cardPath, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Naano creator card",
          url,
        });
        appToast.success({
          title: "Share sheet opened",
          id: "creator-card-share",
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      appToast.info({
        title: "Sharing unavailable",
        description: "Link copied instead.",
        id: "creator-card-share-fallback",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      appToast.error({
        title: "Could not share the card",
        description: "Try copying the link instead.",
        id: "creator-card-share-error",
      });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PrimaryLink href={cardPath} className="!w-auto">
        Open card
      </PrimaryLink>
      <button
        type="button"
        onClick={() => {
          void copyLink();
        }}
        className="inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-page"
      >
        Copy card link
      </button>
      <button
        type="button"
        onClick={() => {
          void shareCard();
        }}
        className="inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-page"
      >
        Share card
      </button>
    </div>
  );
}

export function CreatorOverview({
  profile,
  creator,
  checklist,
  sharePath = "/creator/card",
  opportunityCounts,
  collabCounts,
  unreadMessages = 0,
}: {
  profile: Profile;
  creator: Creator | null;
  checklist: ChecklistItem[];
  sharePath?: string;
  opportunityCounts?: {
    pending: number;
    accepted: number;
    declined: number;
  };
  collabCounts?: {
    active: number;
    completed: number;
    cancelled: number;
  };
  unreadMessages?: number;
}) {
  const firstName = profile.full_name.split(/\s+/)[0] || profile.full_name;
  const completed = checklist.filter((item) => item.done).length;
  const topics =
    creator?.topics?.filter(Boolean).join(", ") || "No topics yet";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Creator workspace"
        title={`Welcome back, ${firstName}`}
        description="Review your public profile, track opportunities, and deliver accepted collaborations."
      />

      <section
        aria-label="Workspace counts"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="Pending opportunities"
          value={String(opportunityCounts?.pending ?? 0)}
          hint="Invitations waiting for your response"
          href="/creator/opportunities"
        />
        <Metric
          label="Active collaborations"
          value={String(collabCounts?.active ?? 0)}
          hint="Accepted work in progress"
          href="/creator/collaborations"
        />
        <Metric
          label="Unread messages"
          value={String(unreadMessages)}
          hint="Collaboration conversations"
          href="/creator/messages"
        />
        <Metric
          label="Completed collaborations"
          value={String(collabCounts?.completed ?? 0)}
          hint="Finished booked work"
          href="/creator/collaborations?filter=completed"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Creator card</h2>
              <p className="mt-1 text-sm text-support">
                How brands see your marketplace profile.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[12px] border border-line bg-page p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {initials(profile.full_name) || "C"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 text-sm text-support">
                  {creator?.headline || "Add a headline to complete your card"}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm font-semibold text-ink">
                {formatPriceCents(creator?.price_cents, creator?.currency)}
                <span className="block text-[11px] font-normal text-ink-subtle">
                  / post
                </span>
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-subtle">Expertise</dt>
                <dd className="mt-0.5 text-ink">{topics}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Audience</dt>
                <dd className="mt-0.5 text-ink">
                  {creator?.audience_summary ||
                    (creator?.audience_size != null
                      ? `${formatCount(creator.audience_size)} followers`
                      : "—")}
                </dd>
              </div>
            </dl>
            {!creator?.linkedin_url ? (
              <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2 text-sm text-support">
                No LinkedIn URL yet. Add it on your card so brands can verify
                your presence.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <CreatorCardActions cardPath={sharePath} />
          </div>
        </section>

        <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Launch guide</h2>
          <p className="mt-1 text-sm text-support">
            {completed} of {checklist.length} setup steps complete
          </p>
          <ul className="mt-5 space-y-3">
            {checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-[12px] border border-line px-3 py-2.5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    item.done
                      ? "bg-success-soft text-success"
                      : "bg-page text-support"
                  }`}
                  aria-hidden
                >
                  {item.done ? "✓" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  {!item.done && item.href ? (
                    <Link
                      href={item.href}
                      className="mt-0.5 inline-block text-xs font-semibold text-accent hover:text-accent-hover"
                    >
                      Complete
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Opportunities</h2>
            <p className="mt-1 text-sm text-support">
              {opportunityCounts
                ? `${opportunityCounts.pending} pending · ${opportunityCounts.accepted} newly accepted · ${opportunityCounts.declined} declined`
                : "Booking requests from brands will appear here."}
            </p>
          </div>
          <SecondaryLink href="/creator/opportunities" className="!w-auto">
            View opportunities
          </SecondaryLink>
        </div>
        <div className="mt-5 rounded-[12px] border border-dashed border-line-strong bg-page px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">
            {(opportunityCounts?.pending ?? 0) +
              (opportunityCounts?.accepted ?? 0) +
              (opportunityCounts?.declined ?? 0) ===
            0
              ? "No opportunities yet"
              : "You have campaign invitations"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-support">
            Accepted work continues under Collaborations
            {(collabCounts?.active ?? 0) > 0
              ? ` (${collabCounts?.active} active)`
              : ""}
            . Reach and engagement analytics stay empty until real published
            performance data exists.
          </p>
          {(collabCounts?.active ?? 0) > 0 ? (
            <Link
              href="/creator/collaborations"
              className="mt-3 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Open collaborations
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <article className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-medium text-support">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p> : null}
    </article>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-[14px] transition-[opacity] duration-150 hover:opacity-95"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
