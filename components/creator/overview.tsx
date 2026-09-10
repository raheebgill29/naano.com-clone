"use client";

import Link from "next/link";

import { ParticipantAvatar } from "@/components/messages/ui";
import { PrimaryLink, SecondaryLink } from "@/components/ui/primitives";
import {
  Portrait,
  SectionTitle,
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import {
  detailHref,
  itemNeedsAttention,
  nextActionLabel,
  primaryAction,
  type CollaborationListItem,
} from "@/lib/collaborations/list-data";
import {
  STATUS_LABEL,
  collaborationStatusBadgeClass,
} from "@/lib/collaborations/status";
import type { InboxItem } from "@/lib/messages/queries";
import { appToast } from "@/lib/toast";
import type { Creator, Profile } from "@/lib/supabase/database.types";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type PendingOpportunity = {
  id: string;
  campaignName: string;
  brandName: string;
  deliverableType: string;
  targetPublishDate: string | null;
  priceCents: number;
  currency: string;
  invitedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function relativeTime(iso: string, nowMs: number) {
  const seconds = Math.round((new Date(iso).getTime() - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

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
  pendingInvites = [],
  collabs = [],
  inbox = [],
  loadedAtMs,
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
  pendingInvites?: PendingOpportunity[];
  collabs?: CollaborationListItem[];
  inbox?: InboxItem[];
  loadedAtMs?: number;
}) {
  const nowMs = loadedAtMs ?? 0;
  const firstName = profile.full_name.split(/\s+/)[0] || profile.full_name;
  const completed = checklist.filter((item) => item.done).length;
  const published = creator?.publication_status === "published";
  const available = creator?.availability === "available";
  const active = collabs.filter(
    (item) => item.status !== "completed" && item.status !== "cancelled",
  );
  const deadlines = active
    .map((item) => ({
      item,
      at: item.scheduled_publish_at ?? item.targetPublishDate,
    }))
    .filter(
      (entry): entry is { item: CollaborationListItem; at: string } =>
        Boolean(entry.at),
    )
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-ink-subtle">
            Creator workspace
          </p>
          <h1 className="display mt-1 text-[2rem] text-ink sm:text-[2.5rem]">
            Good to see you, {firstName}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryLink href="/creator/card" className="!w-auto">
            Edit creator card
          </PrimaryLink>
          <SecondaryLink href="/creator/opportunities" className="!w-auto">
            Opportunities
          </SecondaryLink>
        </div>
      </header>

      <section className="grid gap-4 rounded-[12px] border border-line bg-surface p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5">
        <Portrait
          src={profile.avatar_url}
          name={profile.full_name}
          className="h-20 w-20 sm:h-24 sm:w-24"
          rounded="rounded-[10px]"
          textClass="display text-[2rem]"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${
                published
                  ? "bg-success-soft text-success"
                  : "bg-page text-ink-muted"
              }`}
            >
              {published ? "Live in marketplace" : "Draft card"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  available ? "bg-success" : "bg-line-strong"
                }`}
                aria-hidden
              />
              {available ? "Available" : "Unavailable"}
            </span>
          </div>
          <h2 className="display mt-1.5 truncate text-[1.5rem] text-ink">
            {profile.full_name}
          </h2>
          <p className="truncate text-[13px] text-ink-muted">
            {creator?.headline ||
              "Add a headline so brands know your positioning."}
          </p>
          <dl className="tnum mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            <ProfileMetric
              label="Followers"
              value={
                creator?.audience_size != null
                  ? formatCompactCount(creator.audience_size)
                  : "—"
              }
            />
            <ProfileMetric
              label="Per post"
              value={formatPriceCents(
                creator?.price_cents,
                creator?.currency,
              )}
            />
            <ProfileMetric
              label="Active work"
              value={String(collabCounts?.active ?? 0)}
            />
            <ProfileMetric
              label="Completed"
              value={String(collabCounts?.completed ?? 0)}
            />
          </dl>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          <section>
            <SectionTitle
              title="Needs a decision"
              count={pendingInvites.length}
              action={
                <Link
                  href="/creator/opportunities"
                  className="text-[12px] font-semibold text-ink-muted hover:text-ink"
                >
                  All opportunities
                </Link>
              }
            />
            {pendingInvites.length ? (
              <ul className="mt-2 divide-y divide-line">
                {pendingInvites.map((invite) => (
                  <li key={invite.id}>
                    <Link
                      href="/creator/opportunities"
                      className="group grid gap-2 py-3 sm:grid-cols-[minmax(0,4fr)_minmax(0,2fr)_minmax(0,2fr)] sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ParticipantAvatar name={invite.brandName} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ink group-hover:text-accent">
                            {invite.campaignName}
                          </p>
                          <p className="truncate text-[12px] text-support">
                            {invite.brandName} · {invite.deliverableType}
                          </p>
                        </div>
                      </div>
                      <p className="tnum text-[13px] font-semibold text-ink">
                        {formatPriceCents(
                          invite.priceCents,
                          invite.currency,
                        )}
                      </p>
                      <p className="tnum text-[12px] text-support sm:text-right">
                        {invite.targetPublishDate
                          ? `Target ${formatDate(invite.targetPublishDate)}`
                          : `Invited ${relativeTime(invite.invitedAt, nowMs)}`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-support">
                {published
                  ? "No open invitations. New campaign requests will appear here."
                  : "Publish your card to start receiving campaign invitations."}
              </p>
            )}
          </section>

          <section>
            <SectionTitle
              title="In progress"
              count={active.length}
              action={
                <Link
                  href="/creator/collaborations"
                  className="text-[12px] font-semibold text-ink-muted hover:text-ink"
                >
                  All collaborations
                </Link>
              }
            />
            {active.length ? (
              <ul className="mt-2 divide-y divide-line">
                {active.slice(0, 5).map((item) => {
                  const needsAction = itemNeedsAttention(item);
                  const action = primaryAction(item);
                  return (
                    <li key={item.id}>
                      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <Link
                            href={detailHref("creator", item.id)}
                            className="block truncate text-[14px] font-semibold text-ink hover:text-accent"
                          >
                            {item.campaignName}
                          </Link>
                          <p className="truncate text-[12px] text-support">
                            {item.participantName} · {item.deliverableType}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(item.status)}`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                          <p
                            className={`mt-1 truncate text-[12px] ${
                              needsAction
                                ? "font-semibold text-accent"
                                : "text-support"
                            }`}
                          >
                            {nextActionLabel(item)}
                          </p>
                        </div>
                        <Link
                          href={action.href}
                          className={`inline-flex h-8 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold ${
                            needsAction
                              ? "bg-ink text-white hover:bg-ink-muted"
                              : "border border-line text-ink hover:border-line-strong"
                          }`}
                        >
                          {action.label}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-support">
                Accepted work will show here with its next step.
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-8 lg:col-span-4">
          <section>
            <SectionTitle title="Upcoming deadlines" />
            {deadlines.length ? (
              <ul className="mt-2 divide-y divide-line">
                {deadlines.map(({ item, at }) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="tnum w-12 shrink-0 text-center">
                      <p className="text-[11px] font-medium uppercase text-ink-subtle">
                        {new Date(at).toLocaleDateString(undefined, {
                          month: "short",
                        })}
                      </p>
                      <p className="display text-[1.375rem] leading-none text-ink">
                        {new Date(at).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={detailHref("creator", item.id)}
                        className="block truncate text-[13px] font-semibold text-ink hover:text-accent"
                      >
                        {item.campaignName}
                      </Link>
                      <p className="truncate text-[12px] text-support">
                        {item.scheduled_publish_at
                          ? "Scheduled publish"
                          : "Target date"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-support">No dates scheduled.</p>
            )}
          </section>

          <section>
            <SectionTitle
              title="Messages"
              count={unreadMessages || undefined}
              action={
                <Link
                  href="/creator/messages"
                  className="text-[12px] font-semibold text-ink-muted hover:text-ink"
                >
                  Inbox
                </Link>
              }
            />
            {inbox.length ? (
              <ul className="mt-2 divide-y divide-line">
                {inbox.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/creator/messages/${item.id}`}
                      className="group flex items-start gap-3 py-2.5"
                    >
                      <ParticipantAvatar name={item.otherPartyName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink group-hover:text-accent">
                          {item.otherPartyName}
                          {item.unread ? (
                            <span
                              className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-accent"
                              aria-label="Unread"
                            />
                          ) : null}
                        </p>
                        <p className="truncate text-[12px] text-support">
                          {item.lastPreview ?? item.campaignName}
                        </p>
                      </div>
                      {item.lastAt ? (
                        <span className="shrink-0 text-[11px] text-ink-subtle">
                          {relativeTime(item.lastAt, nowMs)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-support">No conversations yet.</p>
            )}
          </section>

          <section className="rounded-[10px] border border-line bg-page/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">
                Card readiness
              </p>
              <span className="tnum text-[12px] font-semibold text-ink-muted">
                {completed}/{checklist.length}
              </span>
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={checklist.length}
            >
              <div
                className="h-full rounded-full bg-ink"
                style={{
                  width: `${checklist.length ? Math.round((completed / checklist.length) * 100) : 0}%`,
                }}
              />
            </div>
            <ul className="mt-2 space-y-1">
              {checklist
                .filter((item) => !item.done)
                .slice(0, 3)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="truncate text-support">{item.label}</span>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="font-semibold text-ink-muted hover:text-ink"
                      >
                        Fix
                      </Link>
                    ) : null}
                  </li>
                ))}
            </ul>
            <div className="mt-3">
              <CreatorCardActions cardPath={sharePath} />
            </div>
          </section>

          {opportunityCounts ? (
            <p className="text-[12px] text-ink-subtle">
              {opportunityCounts.accepted} accepted ·{" "}
              {opportunityCounts.declined} declined ·{" "}
              {collabCounts?.cancelled ?? 0} cancelled
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink-subtle">{label}</dt>
      <dd className="display mt-0.5 text-[1.375rem] text-ink">{value}</dd>
    </div>
  );
}
