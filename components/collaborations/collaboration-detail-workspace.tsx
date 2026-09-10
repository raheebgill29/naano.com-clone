"use client";

import Link from "next/link";
import { useId, useEffect, useRef, useState } from "react";

import {
  ApproveDraftForm,
  CancelCollabForm,
  CompleteCollabForm,
  PublishUrlForm,
  RequestRevisionForm,
  ScheduleForm,
  SubmitDraftForm,
} from "@/components/collaborations/forms";
import { CollaborationWorkflowProgress } from "@/components/collaborations/workflow-progress";
import { CampaignStatusCallout } from "@/components/campaigns/status-callout";
import { ParticipantAvatar } from "@/components/messages/ui";
import { formatPriceCents } from "@/components/workspace/ui";
import {
  actionPanelTitle,
  detailPrimaryAction,
  draftReviewBadgeClass,
  draftReviewLabel,
  humanizeCollaborationEvent,
} from "@/lib/collaborations/detail-data";
import type { CollaborationMessagePreview } from "@/lib/collaborations/detail-queries";
import {
  STATUS_LABEL,
  WORKFLOW_STAGES,
  collaborationStatusBadgeClass,
  isAwaitingOtherParty,
  isRevisionLoop,
  nextActionForStatus,
  workflowStageIndex,
} from "@/lib/collaborations/status";
import type {
  Campaign,
  CampaignCreator,
  CampaignStatus,
  CollaborationEvent,
  ContentSubmission,
} from "@/lib/supabase/database.types";

type CreatorInfo = {
  id: string;
  slug: string;
  headline: string;
  full_name: string;
} | null;

type BrandInfo = {
  id: string;
  company_name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
} | null;

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

function safeExternalHref(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function CollaborationDetailWorkspace({
  role,
  collab,
  campaign,
  brand,
  creator,
  drafts,
  events,
  actorNames,
  messagePreview,
}: {
  role: "brand" | "creator";
  collab: CampaignCreator;
  campaign: Campaign;
  brand: BrandInfo;
  creator: CreatorInfo;
  drafts: ContentSubmission[];
  events: CollaborationEvent[];
  actorNames: Record<string, string>;
  messagePreview: CollaborationMessagePreview | null;
}) {
  const draftVersions = drafts.filter((d) => d.submission_type === "draft");
  const latestDraft = draftVersions[0] ?? null;
  const olderDrafts = draftVersions.slice(1);
  const readOnly =
    collab.status === "completed" || collab.status === "cancelled";
  const canCancel =
    role === "brand" &&
    !readOnly &&
    [
      "accepted",
      "draft_submitted",
      "revision_requested",
      "approved",
      "scheduled",
      "published",
    ].includes(collab.status);

  const base = role === "brand" ? "/brand" : "/creator";
  const listHref = `${base}/collaborations`;
  const messagesHref = `${base}/messages/${collab.id}`;
  const campaignHref =
    role === "brand" ? `/brand/campaigns/${campaign.id}` : null;

  const otherName =
    role === "brand"
      ? (creator?.full_name ?? "Creator")
      : (brand?.company_name ?? "Brand");
  const otherMeta =
    role === "brand"
      ? (creator?.headline ?? null)
      : (campaign.product_or_company ?? null);

  const primary = detailPrimaryAction(collab.status, role);
  const waiting = isAwaitingOtherParty(collab.status, role);
  const unread = messagePreview?.unread === true;
  const compensation = formatPriceCents(
    collab.price_cents * collab.post_count_snapshot,
    collab.currency,
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-[12px] text-support">
        <Link href={listHref} className="hover:text-ink">
          Collaborations
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        {campaignHref ? (
          <Link href={campaignHref} className="hover:text-ink">
            {campaign.campaign_name}
          </Link>
        ) : (
          <span>{campaign.campaign_name}</span>
        )}
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-ink">{otherName}</span>
      </nav>

      {/* Focused header */}
      <header className="border-b border-line pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <ParticipantAvatar name={otherName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${collaborationStatusBadgeClass(collab.status)}`}
                >
                  {STATUS_LABEL[collab.status]}
                </span>
                {unread ? (
                  <Link
                    href={messagesHref}
                    className="text-[11px] font-semibold text-accent hover:text-accent-hover"
                  >
                    Unread messages
                  </Link>
                ) : null}
              </div>
              <h1 className="display mt-1.5 break-words text-[2rem] leading-[1.05] text-ink sm:text-[2.5rem]">
                {otherName}
              </h1>
              <p className="mt-1.5 text-[14px] text-ink-muted">
                {campaign.campaign_name} · {campaign.deliverable_type}
                {otherMeta ? ` · ${otherMeta}` : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {primary.kind === "scroll-action" ? (
              <a
                href="#workflow-action"
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink-muted"
              >
                {primary.label}
              </a>
            ) : null}
            {primary.kind === "messages" || primary.kind === "none" ? (
              <Link
                href={messagesHref}
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink-muted"
              >
                {primary.kind === "messages" ? primary.label : "Open conversation"}
                {unread ? (
                  <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                    Unread
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                href={messagesHref}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink hover:border-line-strong hover:bg-page"
              >
                Conversation
                {unread ? (
                  <span className="ml-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                ) : null}
              </Link>
            )}
            <DetailOverflow
              messagesHref={messagesHref}
              campaignHref={campaignHref}
              canCancel={canCancel}
            />
          </div>
        </div>

        <div className="mt-6">
          <MilestoneTracker
            status={collab.status}
            updatedAt={collab.updated_at}
            scheduledAt={collab.scheduled_publish_at}
            targetDate={campaign.target_publish_date}
          />
        </div>
      </header>

      {role === "creator" ? (
        <CampaignStatusCallout status={campaign.status as CampaignStatus} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          {/* Required action */}
          <section id="workflow-action" className="scroll-mt-24">
            <div className="flex items-baseline justify-between gap-3 border-t border-ink/80 pt-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
                {waiting ? "Waiting" : readOnly ? "Status" : "Your action"}
              </h2>
              <span className="text-[12px] text-ink-subtle">
                {primary.waitingLabel ?? nextActionForStatus(collab.status, role)}
              </span>
            </div>
            <div
              className={`mt-3 rounded-[12px] border p-4 sm:p-5 ${
                waiting || readOnly
                  ? "border-line bg-surface"
                  : "border-ink/15 bg-surface"
              }`}
            >
              <h3 className="text-[17px] font-semibold text-ink">
                {actionPanelTitle(collab.status, role)}
              </h3>
              {!readOnly ? (
                <div className="mt-4">
                  <ActionSurface
                    role={role}
                    collab={collab}
                    campaign={campaign}
                    latestDraftId={latestDraft?.id}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-support">
                  This collaboration is {STATUS_LABEL[collab.status].toLowerCase()}{" "}
                  and read-only.
                </p>
              )}
            </div>
          </section>

          {collab.status === "revision_requested" && collab.latest_feedback ? (
            <section className="rounded-[12px] border border-warning/35 bg-warning-soft/40 p-4 sm:p-5">
              <h2 className="text-[15px] font-semibold text-ink">
                Revision feedback
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                {collab.latest_feedback}
              </p>
            </section>
          ) : null}

          <LatestDraftCard draft={latestDraft} />

          {olderDrafts.length > 0 ? (
            <DraftHistory drafts={olderDrafts} />
          ) : null}

          {(collab.scheduled_publish_at ||
            collab.published_url ||
            collab.status === "approved" ||
            collab.status === "scheduled" ||
            collab.status === "published" ||
            collab.status === "completed") && (
            <PublishSection collab={collab} role={role} readOnly={readOnly} />
          )}

          {collab.cancel_reason ? (
            <section className="rounded-[12px] border border-danger/25 bg-danger-soft/30 p-4 sm:p-5">
              <h2 className="text-[15px] font-semibold text-ink">
                Cancellation reason
              </h2>
              <p className="mt-2 text-sm text-support">{collab.cancel_reason}</p>
            </section>
          ) : null}

          <ActivityTimeline events={events} actorNames={actorNames} />

          {canCancel ? (
            <section id="cancel-collab" className="scroll-mt-24">
              <div className="border-t border-line pt-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  Cancel collaboration
                </h2>
              </div>
              <p className="mt-2 text-[13px] text-support">
                Cancelling is permanent. Provide a reason the creator can see.
              </p>
              <div className="mt-3 max-w-lg">
                <CancelCollabForm campaignCreatorId={collab.id} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-7 lg:col-span-4">
          <section>
            <div className="border-t border-ink/80 pt-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
                Terms
              </h2>
            </div>
            <dl className="tnum mt-2 divide-y divide-line text-[13px]">
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-support">Compensation</dt>
                <dd className="font-semibold text-ink">{compensation}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-support">Posts</dt>
                <dd className="text-ink">{collab.post_count_snapshot}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-support">Target publish</dt>
                <dd className="text-ink">{formatDate(campaign.target_publish_date)}</dd>
              </div>
              {collab.scheduled_publish_at ? (
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-support">Scheduled</dt>
                  <dd className="text-ink">{formatDateTime(collab.scheduled_publish_at)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <SummaryCard
            role={role}
            collab={collab}
            campaign={campaign}
            brand={brand}
            creator={creator}
            campaignHref={campaignHref}
            otherName={otherName}
            otherMeta={otherMeta}
          />
          <MessagePreviewCard
            preview={messagePreview}
            messagesHref={messagesHref}
            otherName={otherName}
          />
          <BriefCard campaign={campaign} role={role} />
        </aside>
      </div>
    </div>
  );
}

/** Full-width horizontal milestone tracker for the detail header. */
function MilestoneTracker({
  status,
  updatedAt,
  scheduledAt,
  targetDate,
}: {
  status: CampaignCreator["status"];
  updatedAt: string;
  scheduledAt: string | null;
  targetDate: string;
}) {
  if (status === "cancelled" || status === "declined" || status === "booking_pending") {
    return (
      <CollaborationWorkflowProgress
        status={status}
        updatedAt={updatedAt}
        size="detail"
      />
    );
  }

  const current = workflowStageIndex(status);
  const revision = isRevisionLoop(status);
  const total = WORKFLOW_STAGES.length;

  const stageHint = (index: number): string | null => {
    const id = WORKFLOW_STAGES[index]?.id;
    if (id === "scheduled" && scheduledAt) return formatDate(scheduledAt);
    if (id === "published" && !scheduledAt) return `Target ${formatDate(targetDate)}`;
    if (index === current) return `Updated ${formatDate(updatedAt)}`;
    return null;
  };

  return (
    <ol
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      aria-label="Collaboration milestones"
    >
      {WORKFLOW_STAGES.map((stage, index) => {
        const reached = current >= index;
        const isCurrent = current === index;
        const warn = revision && isCurrent;
        return (
          <li key={stage.id} className="min-w-0">
            <div
              className={`h-1 rounded-full ${
                warn
                  ? "bg-warning"
                  : reached
                    ? "bg-ink"
                    : "bg-line"
              }`}
              aria-hidden
            />
            <p
              className={`mt-2 truncate text-[12px] font-semibold ${
                isCurrent ? (warn ? "text-warning" : "text-ink") : reached ? "text-ink-muted" : "text-ink-subtle"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {stage.label}
            </p>
            {stageHint(index) ? (
              <p className="tnum truncate text-[11px] text-ink-subtle">
                {stageHint(index)}
              </p>
            ) : warn && index === current ? (
              <p className="truncate text-[11px] text-warning">Revision requested</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ActionSurface({
  role,
  collab,
  campaign,
  latestDraftId,
}: {
  role: "brand" | "creator";
  collab: CampaignCreator;
  campaign: Campaign;
  latestDraftId?: string;
}) {
  if (role === "brand") {
    if (collab.status === "draft_submitted") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Approve draft</h3>
            <p className="mt-1 text-xs text-support">
              Approve the latest pending draft to move toward scheduling.
            </p>
            <div className="mt-3">
              <ApproveDraftForm
                campaignCreatorId={collab.id}
                contentSubmissionId={latestDraftId}
                disabled={collab.status !== "draft_submitted"}
              />
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">Request revisions</h3>
            <div className="mt-3">
              <RequestRevisionForm campaignCreatorId={collab.id} />
            </div>
          </div>
        </div>
      );
    }
    if (collab.status === "approved") {
      return (
        <div className="max-w-md rounded-[12px] border border-line bg-surface p-4">
          <ScheduleForm
            campaignCreatorId={collab.id}
            defaultDate={campaign.target_publish_date}
          />
        </div>
      );
    }
    if (collab.status === "published") {
      return (
        <div className="max-w-sm rounded-[12px] border border-line bg-surface p-4">
          <CompleteCollabForm campaignCreatorId={collab.id} />
        </div>
      );
    }
    return (
      <p className="text-sm text-support">
        No brand action is available right now. Check messaging or wait for the
        creator.
      </p>
    );
  }

  if (
    collab.status === "accepted" ||
    collab.status === "revision_requested"
  ) {
    return (
      <div className="rounded-[12px] border border-line bg-surface p-4">
        <SubmitDraftForm
          campaignCreatorId={collab.id}
          isRevision={collab.status === "revision_requested"}
        />
      </div>
    );
  }
  if (collab.status === "scheduled") {
    return (
      <div className="max-w-md rounded-[12px] border border-line bg-surface p-4">
        <PublishUrlForm campaignCreatorId={collab.id} />
      </div>
    );
  }
  return (
    <p className="text-sm text-support">
      No creator action is available right now. The brand owns the next step.
    </p>
  );
}

function LatestDraftCard({ draft }: { draft: ContentSubmission | null }) {
  if (!draft) {
    return (
      <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">Current deliverable</h2>
        <p className="mt-3 text-sm text-support">No drafts submitted yet.</p>
      </section>
    );
  }

  const review = draftReviewLabel(draft.review_status);
  const href = draft.asset_url ? safeExternalHref(draft.asset_url) : null;

  return (
    <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">
          Current deliverable{" "}
          <span className="text-ink-subtle">· v{draft.version}</span>
        </h2>
        {review ? (
          <span
            className={`inline-flex rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${draftReviewBadgeClass(draft.review_status)}`}
          >
            {review}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink-subtle">
        Submitted {formatDateTime(draft.created_at)}
        {draft.reviewed_at
          ? ` · Reviewed ${formatDateTime(draft.reviewed_at)}`
          : null}
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">
        {draft.body}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block break-all text-sm font-semibold text-accent hover:text-accent-hover"
        >
          External asset
        </a>
      ) : null}
      {draft.notes ? (
        <p className="mt-3 text-xs text-support">Note: {draft.notes}</p>
      ) : null}
    </section>
  );
}

function DraftHistory({ drafts }: { drafts: ContentSubmission[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-[15px] font-semibold text-ink">
          Draft history{" "}
          <span className="text-ink-subtle">· {drafts.length}</span>
        </h2>
        <span className="text-sm font-semibold text-accent">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <ul className="mt-4 space-y-3">
          {drafts.map((draft) => {
            const review = draftReviewLabel(draft.review_status);
            const href = draft.asset_url
              ? safeExternalHref(draft.asset_url)
              : null;
            return (
              <li
                key={draft.id}
                className="rounded-[12px] border border-line px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    Version {draft.version}
                    {review ? ` · ${review}` : ""}
                  </p>
                  <p className="text-xs text-support">
                    {formatDateTime(draft.created_at)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                  {draft.body}
                </p>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-accent"
                  >
                    Asset link
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function PublishSection({
  collab,
  role,
  readOnly,
}: {
  collab: CampaignCreator;
  role: "brand" | "creator";
  readOnly: boolean;
}) {
  const publishedHref = collab.published_url
    ? safeExternalHref(collab.published_url)
    : null;

  return (
    <section className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold text-ink">
        Scheduling &amp; publishing
      </h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-subtle">Approved</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {collab.approved_at ? formatDateTime(collab.approved_at) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Scheduled publish</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {collab.scheduled_publish_at
              ? formatDate(collab.scheduled_publish_at)
              : collab.status === "approved"
                ? role === "creator"
                  ? "Waiting on brand"
                  : "Not set"
                : "—"}
          </dd>
        </div>
      </dl>
      {publishedHref ? (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-ink-subtle">
            Published URL
          </p>
          <a
            href={publishedHref}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block break-all text-sm font-semibold text-accent hover:text-accent-hover"
          >
            {publishedHref}
          </a>
        </div>
      ) : null}
      {!readOnly &&
      role === "brand" &&
      collab.status === "published" &&
      publishedHref ? (
        <div className="mt-4 max-w-sm">
          <CompleteCollabForm campaignCreatorId={collab.id} />
        </div>
      ) : null}
    </section>
  );
}

function ActivityTimeline({
  events,
  actorNames,
}: {
  events: CollaborationEvent[];
  actorNames: Record<string, string>;
}) {
  return (
    <section>
      <div className="border-t border-line pt-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
          Activity
        </h2>
      </div>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-support">No activity yet.</p>
      ) : (
        <ol className="mt-4 space-y-0">
          {events.map((event, index) => (
            <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {index < events.length - 1 ? (
                <span
                  className="absolute left-[7px] top-3 bottom-0 w-px bg-line"
                  aria-hidden
                />
              ) : null}
              <span
                className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink bg-surface"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {humanizeCollaborationEvent(event.event_type, null)}
                </p>
                {event.message ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-support">
                    {event.message}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-subtle">
                  {event.actor_profile_id
                    ? (actorNames[event.actor_profile_id] ?? "Participant")
                    : "System"}
                  {" · "}
                  {formatDateTime(event.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SummaryCard({
  role,
  collab,
  campaign,
  brand,
  creator,
  campaignHref,
  otherName,
  otherMeta,
}: {
  role: "brand" | "creator";
  collab: CampaignCreator;
  campaign: Campaign;
  brand: BrandInfo;
  creator: CreatorInfo;
  campaignHref: string | null;
  otherName: string;
  otherMeta: string | null;
}) {
  return (
    <section className="border-t border-line pt-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
        Participants
      </h2>
      <div className="mt-3 flex items-start gap-3">
        <ParticipantAvatar name={otherName} />
        <div className="min-w-0">
          <p className="font-semibold text-ink">{otherName}</p>
          {otherMeta ? (
            <p className="mt-0.5 text-sm text-support">{otherMeta}</p>
          ) : null}
          {role === "brand" && creator?.slug ? (
            <Link
              href={`/brand/creators/${creator.slug}`}
              className="mt-1 inline-block text-xs font-semibold text-accent"
            >
              View creator
            </Link>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-medium text-ink-subtle">
            Compensation
          </dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {formatPriceCents(
              collab.price_cents * collab.post_count_snapshot,
              collab.currency,
            )}
          </dd>
          <dd className="text-xs text-support">
            {formatPriceCents(collab.price_cents, collab.currency)} ×{" "}
            {collab.post_count_snapshot} post
            {collab.post_count_snapshot === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-subtle">
            Deliverable
          </dt>
          <dd className="mt-0.5 text-ink">{campaign.deliverable_type}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-subtle">
            Target date
          </dt>
          <dd className="mt-0.5 text-ink">
            {formatDate(campaign.target_publish_date)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-subtle">
            Scheduled
          </dt>
          <dd className="mt-0.5 text-ink">
            {collab.scheduled_publish_at
              ? formatDate(collab.scheduled_publish_at)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-subtle">
            Campaign
          </dt>
          <dd className="mt-0.5 text-ink">
            {campaignHref ? (
              <Link
                href={campaignHref}
                className="font-semibold text-accent hover:text-accent-hover"
              >
                {campaign.campaign_name}
              </Link>
            ) : (
              campaign.campaign_name
            )}
          </dd>
          {role === "creator" && brand ? (
            <dd className="text-xs text-support">{brand.company_name}</dd>
          ) : null}
        </div>
      </dl>
    </section>
  );
}

function MessagePreviewCard({
  preview,
  messagesHref,
  otherName,
}: {
  preview: CollaborationMessagePreview | null;
  messagesHref: string;
  otherName: string;
}) {
  return (
    <section className="border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
          Conversation
        </h2>
        {preview?.unread ? (
          <span className="rounded-[8px] bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            Unread
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-support">
        {preview?.lastPreview
          ? preview.lastPreview
          : `No messages yet with ${otherName}.`}
      </p>
      {preview?.lastAt ? (
        <p className="mt-1 text-xs text-ink-subtle">
          {formatDateTime(preview.lastAt)}
        </p>
      ) : null}
      <Link
        href={messagesHref}
        className="mt-3 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
      >
        Open conversation
      </Link>
    </section>
  );
}

function BriefCard({
  campaign,
  role,
}: {
  campaign: Campaign;
  role: "brand" | "creator";
}) {
  return (
    <section className="border-t border-line pt-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
        Campaign brief
      </h2>
      <p className="mt-2 text-sm text-ink">{campaign.objective}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm text-support">
        {campaign.description}
      </p>
      {role === "creator" ? (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-ink-subtle">
            Guidelines
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-support">
            {campaign.creator_guidelines}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function DetailOverflow({
  messagesHref,
  campaignHref,
  canCancel,
}: {
  messagesHref: string;
  campaignHref: string | null;
  canCancel: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="More collaboration actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[42px] w-10 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink hover:bg-page"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          <Link
            role="menuitem"
            href={messagesHref}
            className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
            onClick={() => setOpen(false)}
          >
            Open conversation
          </Link>
          {campaignHref ? (
            <Link
              role="menuitem"
              href={campaignHref}
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
              onClick={() => setOpen(false)}
            >
              View campaign
            </Link>
          ) : null}
          <a
            role="menuitem"
            href="#workflow-action"
            className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-ink hover:bg-page"
            onClick={() => setOpen(false)}
          >
            Jump to required action
          </a>
          {canCancel ? (
            <a
              role="menuitem"
              href="#cancel-collab"
              className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-danger hover:bg-page"
              onClick={() => setOpen(false)}
            >
              Cancel collaboration
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
