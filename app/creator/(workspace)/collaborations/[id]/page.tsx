import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PublishUrlForm,
  SubmitDraftForm,
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

export default async function CreatorCollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("creator");
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { collab, campaign, brand, drafts, events, error } =
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaboration"
        title={campaign.campaign_name}
        description={`${brand?.company_name ?? "Brand"} · ${STATUS_LABEL[collab.status]}`}
        actions={
          <Link
            href="/creator/collaborations"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Back
          </Link>
        }
      />

      <p className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
        Next: {nextActionForStatus(collab.status, "creator")}
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
          <p className="mt-1 text-xs text-ink-subtle">
            {formatPriceCents(collab.price_cents, collab.currency)} ×{" "}
            {collab.post_count_snapshot} posts
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Target publish date</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {new Date(campaign.target_publish_date).toLocaleDateString()}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-support">Scheduled</p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {collab.scheduled_publish_at
              ? new Date(collab.scheduled_publish_at).toLocaleDateString()
              : "—"}
          </p>
        </article>
      </section>

      {collab.status === "revision_requested" && collab.latest_feedback ? (
        <section className="rounded-xl border border-amber-200 bg-[#fffbeb] p-5">
          <h2 className="text-base font-semibold text-ink">Revision feedback</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {collab.latest_feedback}
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Campaign brief</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">Objective</dt>
            <dd className="mt-0.5 text-ink">{campaign.objective}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Deliverable</dt>
            <dd className="mt-0.5 text-ink">{campaign.deliverable_type}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-subtle">Description</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-ink">
              {campaign.description}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-subtle">Creator guidelines</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-ink">
              {campaign.creator_guidelines}
            </dd>
          </div>
        </dl>
      </section>

      {!readOnly &&
      (collab.status === "accepted" ||
        collab.status === "revision_requested") ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">
            {collab.status === "revision_requested"
              ? "Resubmit draft"
              : "Submit draft"}
          </h2>
          <div className="mt-4">
            <SubmitDraftForm
              campaignCreatorId={collab.id}
              isRevision={collab.status === "revision_requested"}
            />
          </div>
        </section>
      ) : null}

      {!readOnly && collab.status === "scheduled" ? (
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <h2 className="text-base font-semibold text-ink">
            Submit published LinkedIn URL
          </h2>
          <div className="mt-4">
            <PublishUrlForm campaignCreatorId={collab.id} />
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
            className="mt-2 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
          >
            {collab.published_url}
          </a>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Draft versions</h2>
        {draftVersions.length === 0 ? (
          <p className="mt-3 text-sm text-support">No drafts submitted yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {draftVersions.map((draft) => (
              <li
                key={draft.id}
                className="rounded-lg border border-line px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    Version {draft.version}
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

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-base font-semibold text-ink">Activity</h2>
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
