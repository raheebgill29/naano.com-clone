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
  collaborationStatusBadgeClass,
  isAwaitingOtherParty,
  nextActionForStatus,
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

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={listHref}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          Collaborations
        </Link>
        <span className="text-ink-subtle" aria-hidden>
          /
        </span>
        {campaignHref ? (
          <Link
            href={campaignHref}
            className="font-semibold text-accent hover:text-accent-hover"
          >
            {campaign.campaign_name}
          </Link>
        ) : (
          <span className="font-medium text-support">{campaign.campaign_name}</span>
        )}
      </nav>

      <header className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-ink">
                {campaign.campaign_name}
              </h1>
              <span
                className={`inline-flex rounded-[8px] px-2.5 py-1 text-[11px] font-semibold ${collaborationStatusBadgeClass(collab.status)}`}
              >
                {STATUS_LABEL[collab.status]}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ParticipantAvatar name={otherName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{otherName}</p>
                <p className="truncate text-xs text-support">
                  {campaign.deliverable_type}
                  {otherMeta ? ` · ${otherMeta}` : null}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {primary.kind === "scroll-action" ? (
              <a
                href="#workflow-action"
                className="inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                {primary.label}
              </a>
            ) : null}
            {primary.kind === "messages" || primary.kind === "none" ? (
              <Link
                href={messagesHref}
                className="inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
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
                className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page"
              >
                Open conversation
                {unread ? (
                  <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
                    Unread
                  </span>
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

        <div className="mt-4 border-t border-line pt-4">
          <CollaborationWorkflowProgress
            status={collab.status}
            updatedAt={collab.updated_at}
            size="detail"
          />
        </div>
      </header>

      {role === "creator" ? (
        <CampaignStatusCallout status={campaign.status as CampaignStatus} />
      ) : null}

      <section
        id="workflow-action"
        className={`scroll-mt-24 rounded-[14px] border p-4 shadow-[var(--shadow-sm)] sm:p-5 ${
          waiting
            ? "border-line bg-page"
            : readOnly
              ? "border-line bg-surface"
              : "border-accent/30 bg-accent-soft/30"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
              Required action
            </p>
            <h2 className="mt-1 text-base font-semibold text-ink">
              {actionPanelTitle(collab.status, role)}
            </h2>
            {primary.waitingLabel ? (
              <p className="mt-1 text-sm font-medium text-support">
                {primary.waitingLabel}
              </p>
            ) : (
              <p className="mt-1 text-sm text-support">
                {nextActionForStatus(collab.status, role)}
              </p>
            )}
          </div>
        </div>

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
          <p className="mt-3 text-sm text-support">
            This collaboration is {STATUS_LABEL[collab.status].toLowerCase()} and
            read-only.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-8">
          {collab.status === "revision_requested" && collab.latest_feedback ? (
            <section className="rounded-[14px] border border-warning/35 bg-warning-soft/40 p-4 sm:p-5">
              <h2 className="text-base font-semibold text-ink">
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
            <section className="rounded-[14px] border border-danger/25 bg-danger-soft/30 p-4 sm:p-5">
              <h2 className="text-base font-semibold text-ink">
                Cancellation reason
              </h2>
              <p className="mt-2 text-sm text-support">{collab.cancel_reason}</p>
            </section>
          ) : null}

          {canCancel ? (
            <section
              id="cancel-collab"
              className="scroll-mt-24 rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5"
            >
              <h2 className="text-base font-semibold text-ink">
                Cancel collaboration
              </h2>
              <p className="mt-1 text-sm text-support">
                Cancelling is permanent. Provide a reason the creator can see.
              </p>
              <div className="mt-4 max-w-lg">
                <CancelCollabForm campaignCreatorId={collab.id} />
              </div>
            </section>
          ) : null}

          <ActivityTimeline events={events} actorNames={actorNames} />
        </div>

        <aside className="min-w-0 space-y-4 lg:col-span-4">
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
      <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <h2 className="text-base font-semibold text-ink">Latest draft</h2>
        <p className="mt-3 text-sm text-support">No drafts submitted yet.</p>
      </section>
    );
  }

  const review = draftReviewLabel(draft.review_status);
  const href = draft.asset_url ? safeExternalHref(draft.asset_url) : null;

  return (
    <section className="rounded-[14px] border border-accent/25 bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">
          Latest draft · Version {draft.version}
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-base font-semibold text-ink">
          Earlier versions ({drafts.length})
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <h2 className="text-base font-semibold text-ink">
        Scheduling & publishing
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
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-subtle">
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <h2 className="text-base font-semibold text-ink">Activity</h2>
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
                className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-accent bg-surface"
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <h2 className="text-sm font-semibold text-ink">Collaboration summary</h2>
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
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
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
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
            Deliverable
          </dt>
          <dd className="mt-0.5 text-ink">{campaign.deliverable_type}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
            Target date
          </dt>
          <dd className="mt-0.5 text-ink">
            {formatDate(campaign.target_publish_date)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
            Scheduled
          </dt>
          <dd className="mt-0.5 text-ink">
            {collab.scheduled_publish_at
              ? formatDate(collab.scheduled_publish_at)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Conversation</h2>
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
    <section className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <h2 className="text-sm font-semibold text-ink">Campaign brief</h2>
      <p className="mt-2 text-sm text-ink">{campaign.objective}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm text-support">
        {campaign.description}
      </p>
      {role === "creator" ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
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
          className="absolute right-0 z-30 mt-2 w-56 rounded-[14px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
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
