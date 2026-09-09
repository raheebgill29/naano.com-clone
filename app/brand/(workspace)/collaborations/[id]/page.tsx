import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ApproveDraftForm,
  CancelCollabForm,
  CompleteCollabForm,
  RequestRevisionForm,
  ScheduleForm,
} from "@/components/collaborations/forms";
import {
  EmptyState,
  PageHeader,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import {
  STATUS_LABEL,
  getCollaborationDetail,
  nextActionForStatus,
} from "@/lib/collaborations/queries";

export default async function BrandCollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("brand");
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { collab, campaign, creator, drafts, events, error } =
    await getCollaborationDetail(id);

  if (error) {
    return (
      <EmptyState title="Could not load collaboration" description={error} />
    );
  }
  if (!collab || !campaign) notFound();

  const draftVersions = drafts.filter((d) => d.submission_type === "draft");
  const readOnly =
    collab.status === "completed" || collab.status === "cancelled";
  const canCancel =
    !readOnly &&
    [
      "accepted",
      "draft_submitted",
      "revision_requested",
      "approved",
      "scheduled",
      "published",
    ].includes(collab.status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaboration review"
        title={creator?.full_name ?? "Creator"}
        description={`${campaign.campaign_name} · ${STATUS_LABEL[collab.status]}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/brand/messages/${collab.id}`}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-[#f7f8fa]"
            >
              Open conversation
            </Link>
            <Link
              href="/brand/collaborations"
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              ← Back
            </Link>
          </div>
        }
      />

      <p className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
        Next: {nextActionForStatus(collab.status, "brand")}
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Compensation snapshot</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatPriceCents(
              collab.price_cents * collab.post_count_snapshot,
              collab.currency,
            )}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Campaign target</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {new Date(campaign.target_publish_date).toLocaleDateString()}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Creator</p>
          <p className="mt-2 text-base font-semibold text-ink">
            {creator?.full_name ?? "—"}
          </p>
          <p className="mt-1 text-xs text-support">{creator?.headline}</p>
        </article>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Brief</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">Objective</dt>
            <dd className="mt-0.5 text-ink">{campaign.objective}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Deliverable</dt>
            <dd className="mt-0.5 text-ink">
              {campaign.deliverable_type} · {collab.post_count_snapshot} post
              {collab.post_count_snapshot === 1 ? "" : "s"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-subtle">Description</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-ink">
              {campaign.description}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Draft versions</h2>
        {draftVersions.length === 0 ? (
          <p className="mt-3 text-sm text-support">No drafts submitted yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {draftVersions.map((draft, index) => (
              <li
                key={draft.id}
                className={`rounded-lg border px-4 py-3 ${
                  index === 0
                    ? "border-accent bg-accent-soft/40"
                    : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    Version {draft.version}
                    {index === 0 ? " · latest" : ""}
                    {draft.review_status === "approved"
                      ? " · approved"
                      : draft.review_status === "revision_requested"
                        ? " · revisions requested"
                        : draft.review_status === "pending"
                          ? " · pending review"
                          : ""}
                  </p>
                  <p className="text-xs text-support">
                    {new Date(draft.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                  {draft.body}
                </p>
                {draft.asset_url ? (
                  <a
                    href={draft.asset_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-accent"
                  >
                    Asset link
                  </a>
                ) : null}
                {draft.notes ? (
                  <p className="mt-2 text-xs text-support">Note: {draft.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!readOnly && collab.status === "draft_submitted" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <h2 className="text-base font-semibold text-ink">Approve</h2>
            <p className="mt-1 text-sm text-support">
              Approve the latest pending draft to move toward scheduling.
            </p>
            <div className="mt-4">
              <ApproveDraftForm
                campaignCreatorId={collab.id}
                contentSubmissionId={draftVersions[0]?.id}
                disabled={collab.status !== "draft_submitted"}
              />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <h2 className="text-base font-semibold text-ink">Request revisions</h2>
            <div className="mt-4">
              <RequestRevisionForm campaignCreatorId={collab.id} />
            </div>
          </div>
        </section>
      ) : null}

      {!readOnly && collab.status === "approved" ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Schedule publication</h2>
          <p className="mt-1 text-sm text-support">
            Approved
            {collab.approved_at
              ? ` ${new Date(collab.approved_at).toLocaleString()}`
              : ""}
            . Set the publish date next.
          </p>
          <div className="mt-4 max-w-md">
            <ScheduleForm
              campaignCreatorId={collab.id}
              defaultDate={campaign.target_publish_date}
            />
          </div>
        </section>
      ) : null}

      {collab.published_url ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <h2 className="text-base font-semibold text-ink">Published URL</h2>
          <a
            href={collab.published_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block break-all text-sm font-semibold text-accent"
          >
            {collab.published_url}
          </a>
          {!readOnly && collab.status === "published" ? (
            <div className="mt-4 max-w-sm">
              <CompleteCollabForm campaignCreatorId={collab.id} />
            </div>
          ) : null}
        </section>
      ) : null}

      {collab.latest_feedback && collab.status === "revision_requested" ? (
        <section className="rounded-xl border border-amber-200 bg-[#fffbeb] p-5">
          <h2 className="text-base font-semibold text-ink">Latest feedback sent</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {collab.latest_feedback}
          </p>
        </section>
      ) : null}

      {canCancel ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">Cancel collaboration</h2>
          <p className="mt-1 text-sm text-support">
            Cancelling is permanent. Provide a reason the creator can see.
          </p>
          <div className="mt-4 max-w-lg">
            <CancelCollabForm campaignCreatorId={collab.id} />
          </div>
        </section>
      ) : null}

      {collab.cancel_reason ? (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Cancellation reason</h2>
          <p className="mt-2 text-sm text-support">{collab.cancel_reason}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Activity timeline</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-support">No activity yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="border-l-2 border-line pl-3">
                <p className="text-sm font-semibold text-ink">
                  {event.event_type.replace(/_/g, " ")}
                </p>
                {event.message ? (
                  <p className="mt-0.5 text-sm text-support">{event.message}</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-subtle">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
