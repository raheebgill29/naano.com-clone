"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";

import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { ConfirmButton } from "@/components/campaigns/ConfirmButton";
import { LoadErrorToast } from "@/components/ui/load-error-toast";
import { ParticipantAvatar } from "@/components/messages/ui";
import { EmptyState, formatPriceCents } from "@/components/workspace/ui";
import { withdrawInvitation } from "@/lib/campaigns/actions";
import { transitionCampaignAction } from "@/lib/campaigns/actions";
import {
  brandNextActionForInvite,
  collaborationTabInvites,
  getCampaignDetailPrimaryAction,
  invitationDisplayLabel,
  type CampaignDetailActivityItem,
  type CampaignDetailInvitation,
  type CampaignDetailPrimaryAction,
  type CampaignDetailTab,
} from "@/lib/campaigns/detail-data";
import { campaignProgressPercent } from "@/lib/campaigns/list-data";
import {
  CAMPAIGN_ACTION_LABEL,
  CAMPAIGN_STATUS_EXPLANATION,
  CAMPAIGN_STATUS_LABEL,
  analyzeCampaignLifecycleBlockers,
  availableCampaignActions,
  campaignIsReadOnly,
  campaignStatusBadgeClass,
  campaignsAcceptInvites,
  type CampaignLifecycleAction,
} from "@/lib/campaigns/status";
import {
  STATUS_LABEL,
  collaborationStatusBadgeClass,
} from "@/lib/collaborations/status";
import type { Campaign, CampaignStatus } from "@/lib/supabase/database.types";
import { appToast } from "@/lib/toast";
import type { CampaignListStats } from "@/lib/campaigns/list-data";

const CONFIRM_COPY: Partial<Record<CampaignLifecycleAction, string>> = {
  complete:
    "Mark this campaign complete? It will become read-only. You can archive it afterward.",
  archive:
    "Archive this campaign? It will leave the default list but history is kept.",
};

const TABS: Array<{ key: CampaignDetailTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "creators", label: "Creators" },
  { key: "collaborations", label: "Collaborations" },
  { key: "activity", label: "Activity" },
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeUpdated(iso: string, nowMs: number) {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 48) return rtf.format(hr, "hour");
  const day = Math.round(hr / 24);
  return rtf.format(day, "day");
}

export function CampaignDetailWorkspace({
  campaign,
  invitations,
  activity,
  stats,
  committedCostCents,
  inviteError,
  searchParams,
  loadedAtMs,
}: {
  campaign: Campaign;
  invitations: CampaignDetailInvitation[];
  activity: CampaignDetailActivityItem[];
  stats: CampaignListStats;
  committedCostCents: number;
  inviteError: string | null;
  searchParams: Record<string, string | string[] | undefined>;
  loadedAtMs: number;
}) {
  const router = useRouter();
  const tabParam = first(searchParams.tab) as CampaignDetailTab | undefined;
  const tab: CampaignDetailTab = TABS.some((t) => t.key === tabParam)
    ? (tabParam as CampaignDetailTab)
    : "overview";

  const status = campaign.status as CampaignStatus;
  const readOnly = campaignIsReadOnly(status);
  const canEdit = status === "draft";
  const canInvite = campaignsAcceptInvites(status) && !readOnly;
  const blockers = analyzeCampaignLifecycleBlockers(invitations);
  const lifecycleActions = availableCampaignActions(status, blockers);
  const primary = getCampaignDetailPrimaryAction({ campaign, invitations });
  const progress = campaignProgressPercent(stats);
  const collabs = collaborationTabInvites(invitations);

  function setTab(next: CampaignDetailTab) {
    const params = new URLSearchParams();
    if (next !== "overview") params.set("tab", next);
    const qs = params.toString();
    router.push(
      qs
        ? `/brand/campaigns/${campaign.id}?${qs}`
        : `/brand/campaigns/${campaign.id}`,
    );
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <Link
          href="/brand/campaigns"
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          ← Back to campaigns
        </Link>
      </nav>

      <header className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">
                {campaign.campaign_name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${campaignStatusBadgeClass(status)}`}
              >
                {CAMPAIGN_STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-support">
              {campaign.product_or_company}
              {campaign.objective ? ` · ${campaign.objective}` : null}
            </p>
            <p className="mt-2 text-xs text-ink-subtle">
              Created {formatDate(campaign.created_at)} · Updated{" "}
              {relativeUpdated(campaign.updated_at, loadedAtMs)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {primary ? (
              <PrimaryActionButton
                campaignId={campaign.id}
                primary={primary}
              />
            ) : null}
            <DetailOverflowMenu
              campaignId={campaign.id}
              status={status}
              canEdit={canEdit}
              canInvite={canInvite}
              actions={lifecycleActions}
              primary={primary}
            />
          </div>
        </div>
      </header>

      <SummaryStrip
        campaign={campaign}
        stats={stats}
        committedCostCents={committedCostCents}
        progress={progress}
      />

      <div
        role="tablist"
        aria-label="Campaign sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {TABS.map((entry) => {
          const selected = tab === entry.key;
          const count =
            entry.key === "creators"
              ? invitations.length
              : entry.key === "collaborations"
                ? collabs.length
                : entry.key === "activity"
                  ? activity.length
                  : null;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(entry.key)}
              className={`shrink-0 rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                selected
                  ? "bg-accent text-white"
                  : "border border-line bg-surface text-ink hover:bg-page"
              }`}
            >
              {entry.label}
              {count != null ? (
                <span
                  className={`ml-1.5 tabular-nums ${selected ? "text-white/80" : "text-ink-subtle"}`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <OverviewSection
          campaign={campaign}
          canEdit={canEdit}
          readOnly={readOnly}
          status={status}
          blockers={blockers}
          primary={primary}
          committedCostCents={committedCostCents}
          stats={stats}
        />
      ) : null}

      {tab === "creators" ? (
        <CreatorsSection
          campaignId={campaign.id}
          invitations={invitations}
          inviteError={inviteError}
          canInvite={canInvite}
          loadedAtMs={loadedAtMs}
        />
      ) : null}

      {tab === "collaborations" ? (
        <CollaborationsSection
          invitations={collabs}
          loadedAtMs={loadedAtMs}
        />
      ) : null}

      {tab === "activity" ? <ActivitySection activity={activity} /> : null}
    </div>
  );
}

function SummaryStrip({
  campaign,
  stats,
  committedCostCents,
  progress,
}: {
  campaign: Campaign;
  stats: CampaignListStats;
  committedCostCents: number;
  progress: number | null;
}) {
  const cells = [
    {
      label: "Target date",
      value: formatDate(campaign.target_publish_date),
    },
    {
      label: "Budget",
      value: formatPriceCents(campaign.budget_cents, campaign.currency),
    },
    {
      label: "Committed",
      value: formatPriceCents(committedCostCents, campaign.currency),
    },
    { label: "Invited", value: String(stats.invited) },
    { label: "Active", value: String(stats.active) },
    { label: "Completed", value: String(stats.completed) },
  ];

  return (
    <section className="rounded-[12px] border border-line bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0">
            <p className="text-[11px] font-medium text-ink-subtle">
              {cell.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
      {progress != null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-ink-subtle">
            <span>Collaboration progress</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-page"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Collaboration progress"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OverviewSection({
  campaign,
  canEdit,
  readOnly,
  status,
  blockers,
  primary,
  committedCostCents,
  stats,
}: {
  campaign: Campaign;
  canEdit: boolean;
  readOnly: boolean;
  status: CampaignStatus;
  blockers: ReturnType<typeof analyzeCampaignLifecycleBlockers>;
  primary: CampaignDetailPrimaryAction | null;
  committedCostCents: number;
  stats: CampaignListStats;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-8">
        <section className="rounded-[12px] border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Campaign brief</h2>
          {canEdit ? (
            <div className="mt-4">
              <CampaignForm campaign={campaign} campaignId={campaign.id} />
            </div>
          ) : (
            <div className="mt-4 space-y-5 text-sm">
              <BriefBlock title="Objective" body={campaign.objective} />
              <BriefBlock
                title="Description"
                body={campaign.description}
                pre
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <BriefBlock
                  title="Deliverable"
                  body={`${campaign.deliverable_type} · ${campaign.post_count} post${campaign.post_count === 1 ? "" : "s"}`}
                />
                <BriefBlock
                  title="Target publish date"
                  body={formatDate(campaign.target_publish_date)}
                />
              </div>
              <div>
                <h3 className="text-[11px] font-medium text-ink-subtle">
                  Key messages
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
                  {(campaign.key_messages ?? []).map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
              <BriefBlock
                title="Creator guidelines"
                body={campaign.creator_guidelines}
                pre
              />
              {readOnly ? (
                <p className="rounded-[12px] bg-page px-3 py-2 text-xs text-support">
                  Brief editing is locked for completed and archived campaigns.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <aside className="min-w-0 space-y-4 lg:col-span-4">
        <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Status</h2>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${campaignStatusBadgeClass(status)}`}
          >
            {CAMPAIGN_STATUS_LABEL[status]}
          </span>
          <p className="mt-2 text-sm text-support">
            {CAMPAIGN_STATUS_EXPLANATION[status]}
          </p>
        </section>

        <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Budget summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-support">Limit</dt>
              <dd className="font-semibold text-ink">
                {formatPriceCents(campaign.budget_cents, campaign.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-support">Committed</dt>
              <dd className="font-semibold text-ink">
                {formatPriceCents(committedCostCents, campaign.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-support">Remaining</dt>
              <dd className="font-semibold text-ink">
                {formatPriceCents(
                  Math.max(0, campaign.budget_cents - committedCostCents),
                  campaign.currency,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Next action</h2>
          {primary ? (
            <div className="mt-3">
              <PrimaryActionButton
                campaignId={campaign.id}
                primary={primary}
                fullWidth
              />
              <p className="mt-2 text-xs text-support">
                {stats.draftsAwaitingReview > 0
                  ? `${stats.draftsAwaitingReview} draft${stats.draftsAwaitingReview === 1 ? "" : "s"} awaiting review.`
                  : CAMPAIGN_STATUS_EXPLANATION[status]}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-support">
              No immediate action required.
            </p>
          )}
        </section>

        {(blockers.pendingInvitations > 0 ||
          blockers.activeCollaborations > 0) &&
        (status === "active" || status === "paused") ? (
          <section className="rounded-[12px] border border-warning/30 bg-warning-soft/40 p-4">
            <h2 className="text-sm font-semibold text-ink">Blockers</h2>
            <p className="mt-2 text-sm text-support">
              Before completing:{" "}
              {blockers.pendingInvitations > 0
                ? `${blockers.pendingInvitations} pending invitation${blockers.pendingInvitations === 1 ? "" : "s"}`
                : null}
              {blockers.pendingInvitations > 0 &&
              blockers.activeCollaborations > 0
                ? " · "
                : null}
              {blockers.activeCollaborations > 0
                ? `${blockers.activeCollaborations} active collaboration${blockers.activeCollaborations === 1 ? "" : "s"}`
                : null}
              .
            </p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function BriefBlock({
  title,
  body,
  pre,
}: {
  title: string;
  body: string;
  pre?: boolean;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-medium text-ink-subtle">
        {title}
      </h3>
      <p
        className={`mt-1.5 text-ink ${pre ? "whitespace-pre-wrap" : ""}`}
      >
        {body}
      </p>
    </div>
  );
}

function CreatorsSection({
  campaignId,
  invitations,
  inviteError,
  canInvite,
  loadedAtMs,
}: {
  campaignId: string;
  invitations: CampaignDetailInvitation[];
  inviteError: string | null;
  canInvite: boolean;
  loadedAtMs: number;
}) {
  return (
    <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          Creators and invitations
        </h2>
        {canInvite ? (
          <Link
            href={`/brand/discover?campaignId=${campaignId}`}
            className="inline-flex items-center justify-center rounded-[12px] bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Invite creators
          </Link>
        ) : (
          <p className="text-xs text-support">
            New invitations are unavailable for this campaign status.
          </p>
        )}
      </div>

      {inviteError ? (
        <>
          <LoadErrorToast
            message={inviteError}
            id={`campaign-invites:${campaignId}`}
          />
          <p className="mt-4 text-sm text-support">
            Invites could not be loaded. Refresh to try again.
          </p>
        </>
      ) : invitations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No creators invited yet"
            description="Invite published creators from the marketplace. Pending and accepted invitations will appear here."
            action={
              canInvite ? (
                <Link
                  href={`/brand/discover?campaignId=${campaignId}`}
                  className="text-sm font-semibold text-accent"
                >
                  Open marketplace
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {invitations.map((inv) => (
            <li key={inv.id}>
              <InvitationRow invite={inv} loadedAtMs={loadedAtMs} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InvitationRow({
  invite,
  loadedAtMs,
}: {
  invite: CampaignDetailInvitation;
  loadedAtMs: number;
}) {
  const name = invite.creator?.full_name ?? "Creator";
  const total = invite.price_cents * invite.post_count_snapshot;
  const isPending = invite.status === "booking_pending";
  const isCollab =
    invite.status !== "booking_pending" &&
    invite.status !== "declined" &&
    !(invite.status === "cancelled" && !invite.accepted_at);

  return (
    <article className="rounded-[12px] border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ParticipantAvatar name={name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <span
                className={`inline-flex rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(invite.status)}`}
              >
                {invitationDisplayLabel(invite)}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-support">
              {invite.creator?.headline ?? "—"}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] font-medium text-ink-subtle">
                  Price
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {formatPriceCents(invite.price_cents, invite.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-ink-subtle">
                  Posts
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {invite.post_count_snapshot}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-ink-subtle">
                  Total
                </dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {formatPriceCents(total, invite.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-ink-subtle">
                  Updated
                </dt>
                <dd className="mt-0.5 text-ink">
                  {relativeUpdated(invite.updated_at, loadedAtMs)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          {invite.creator?.slug ? (
            <Link
              href={`/brand/creators/${invite.creator.slug}`}
              className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
            >
              View creator
            </Link>
          ) : null}
          {isPending ? (
            <form action={withdrawInvitation}>
              <input
                type="hidden"
                name="campaign_creator_id"
                value={invite.id}
              />
              <ConfirmButton confirmText="Withdraw this pending invitation?">
                Withdraw invitation
              </ConfirmButton>
            </form>
          ) : null}
          {isCollab ? (
            <Link
              href={`/brand/collaborations/${invite.id}`}
              className="inline-flex items-center justify-center rounded-[12px] bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Open collaboration
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CollaborationsSection({
  invitations,
  loadedAtMs,
}: {
  invitations: CampaignDetailInvitation[];
  loadedAtMs: number;
}) {
  if (invitations.length === 0) {
    return (
      <EmptyState
        title="No collaborations yet"
        description="Accepted invitations become collaborations you can review, schedule, and complete."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {invitations.map((inv) => {
        const name = inv.creator?.full_name ?? "Creator";
        const attention =
          inv.status === "draft_submitted" || inv.status === "published";
        const dateIso = inv.scheduled_publish_at;
        return (
          <li key={inv.id}>
            <Link
              href={`/brand/collaborations/${inv.id}`}
              className={`block rounded-[12px] border bg-surface p-4 transition-colors hover:border-line-strong ${
                attention ? "border-warning/40" : "border-line"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <ParticipantAvatar name={name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{name}</p>
                      <span
                        className={`inline-flex rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(inv.status)}`}
                      >
                        {STATUS_LABEL[inv.status]}
                      </span>
                      {inv.unread ? (
                        <span className="rounded-[8px] bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-support">
                      {formatPriceCents(
                        inv.price_cents * inv.post_count_snapshot,
                        inv.currency,
                      )}
                      {dateIso
                        ? ` · Scheduled ${formatDate(dateIso)}`
                        : null}{" "}
                      · Updated {relativeUpdated(inv.updated_at, loadedAtMs)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-accent">
                      Next: {brandNextActionForInvite(inv.status)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent">Open</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActivitySection({
  activity,
}: {
  activity: CampaignDetailActivityItem[];
}) {
  if (activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Lifecycle changes, invitations, and collaboration events will appear here."
      />
    );
  }

  return (
    <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-base font-semibold text-ink">Activity</h2>
      <ol className="mt-4 space-y-0">
        {activity.map((item, index) => (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < activity.length - 1 ? (
              <span
                className="absolute left-[7px] top-3 bottom-0 w-px bg-line"
                aria-hidden
              />
            ) : null}
            <span
              className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-accent bg-surface"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {item.href ? (
                  <Link href={item.href} className="hover:text-accent">
                    {item.description}
                  </Link>
                ) : (
                  item.description
                )}
              </p>
              <p className="mt-0.5 text-xs text-support">
                {[item.actorName, item.creatorName]
                  .filter(Boolean)
                  .join(" · ") || "System"}
                {" · "}
                {formatDateTime(item.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PrimaryActionButton({
  campaignId,
  primary,
  fullWidth,
}: {
  campaignId: string;
  primary: CampaignDetailPrimaryAction;
  fullWidth?: boolean;
}) {
  const width = fullWidth ? "w-full" : "";
  if (primary.kind === "link" && primary.href) {
    return (
      <Link
        href={primary.href}
        className={`inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover ${width}`}
      >
        {primary.label}
      </Link>
    );
  }
  if (primary.kind === "lifecycle" && primary.action) {
    return (
      <LifecycleActionButton
        campaignId={campaignId}
        action={primary.action}
        label={primary.label}
        requiresConfirm={primary.requiresConfirm}
        className={`inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 ${width}`}
      />
    );
  }
  return null;
}

function DetailOverflowMenu({
  campaignId,
  status,
  canEdit,
  canInvite,
  actions,
  primary,
}: {
  campaignId: string;
  status: CampaignStatus;
  canEdit: boolean;
  canInvite: boolean;
  actions: ReturnType<typeof availableCampaignActions>;
  primary: CampaignDetailPrimaryAction | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const primaryLifecycle = primary?.kind === "lifecycle" ? primary.action : null;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const secondaryLifecycle = actions.filter(
    (a) => a.action !== primaryLifecycle,
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="More campaign actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[42px] w-10 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink hover:bg-page"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          {canEdit ? (
            <Link
              role="menuitem"
              href={`/brand/campaigns/${campaignId}?tab=overview`}
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              Edit draft
            </Link>
          ) : null}
          {canInvite ? (
            <Link
              role="menuitem"
              href={`/brand/discover?campaignId=${campaignId}`}
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              Invite creators
            </Link>
          ) : null}
          {status !== "archived" ? (
            <Link
              role="menuitem"
              href={`/brand/campaigns/${campaignId}?tab=collaborations`}
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              View collaborations
            </Link>
          ) : null}
          {secondaryLifecycle.map((entry) => (
            <LifecycleActionButton
              key={entry.action}
              campaignId={campaignId}
              action={entry.action}
              label={CAMPAIGN_ACTION_LABEL[entry.action]}
              requiresConfirm={entry.requiresConfirm}
              disabled={!entry.enabled}
              reason={entry.reason}
              className="flex w-full flex-col rounded-[10px] px-3 py-2 text-left hover:bg-page disabled:cursor-not-allowed disabled:opacity-50 [&>span]:text-sm [&>span]:font-semibold [&>span]:text-ink"
            />
          ))}
          {secondaryLifecycle.length === 0 && !canEdit && !canInvite ? (
            <p className="px-3 py-2 text-xs text-support">
              No additional actions.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LifecycleActionButton({
  campaignId,
  action,
  label,
  requiresConfirm,
  className,
  disabled,
  reason,
}: {
  campaignId: string;
  action: CampaignLifecycleAction;
  label: string;
  requiresConfirm?: boolean;
  className?: string;
  disabled?: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (disabled) return;
    if (requiresConfirm) {
      const text = CONFIRM_COPY[action];
      if (text && !window.confirm(text)) return;
    }
    const fd = new FormData();
    fd.set("campaign_id", campaignId);
    fd.set("action", action);
    startTransition(async () => {
      const result = await transitionCampaignAction({}, fd);
      if (result.error) {
        appToast.error({
          title: result.error,
          id: `campaign-detail:${campaignId}:${action}:error`,
        });
        return;
      }
      if (result.success) {
        appToast.success({
          title: result.success,
          id: `campaign-detail:${campaignId}:${action}:ok`,
        });
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled || pending}
      title={reason}
      onClick={run}
      className={className}
    >
      <span>{pending ? "Updating…" : label}</span>
      {reason ? (
        <span className="mt-0.5 text-[11px] font-normal text-support">
          {reason}
        </span>
      ) : null}
    </button>
  );
}

export function CampaignDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-40 animate-pulse rounded bg-page" />
      <div className="h-28 animate-pulse rounded-[12px] border border-line bg-surface" />
      <div className="h-24 animate-pulse rounded-[12px] border border-line bg-surface" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 animate-pulse rounded-[12px] bg-page"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[12px] border border-line bg-surface" />
    </div>
  );
}
