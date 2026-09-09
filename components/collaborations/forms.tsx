"use client";

import { useActionState } from "react";

import { FormMessage, TextArea, Field } from "@/components/ui/primitives";
import {
  approveDraftAction,
  cancelCollabAction,
  completeCollabAction,
  requestRevisionAction,
  scheduleCollabAction,
  submitDraftAction,
  submitPublishedUrlAction,
  type CollabActionState,
} from "@/lib/collaborations/actions";
import { ConfirmButton } from "@/components/campaigns/ConfirmButton";

const initial: CollabActionState = {};

export function SubmitDraftForm({
  campaignCreatorId,
  isRevision,
}: {
  campaignCreatorId: string;
  isRevision?: boolean;
}) {
  const [state, action, pending] = useActionState(submitDraftAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <TextArea
        label={isRevision ? "Revised draft" : "Draft post copy"}
        name="body"
        required
        rows={8}
        placeholder="Write the LinkedIn post draft here…"
      />
      <Field
        label="Asset / document URL (optional)"
        name="asset_url"
        type="url"
        placeholder="https://…"
        hint="Link to a drive file, design, or reference asset."
      />
      <TextArea
        label="Note to brand (optional)"
        name="notes"
        rows={2}
        placeholder="Anything the reviewer should know"
      />
      <FormMessage error={state.error} success={state.success} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending
          ? "Submitting…"
          : isRevision
            ? "Resubmit draft"
            : "Submit draft"}
      </button>
    </form>
  );
}

export function RequestRevisionForm({
  campaignCreatorId,
}: {
  campaignCreatorId: string;
}) {
  const [state, action, pending] = useActionState(
    requestRevisionAction,
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <TextArea
        label="Revision feedback"
        name="feedback"
        required
        rows={4}
        placeholder="Be specific about what to change…"
      />
      <FormMessage error={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request revisions"}
      </button>
    </form>
  );
}

export function ApproveDraftForm({
  campaignCreatorId,
}: {
  campaignCreatorId: string;
}) {
  return (
    <form action={approveDraftAction}>
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Approve latest draft
      </button>
    </form>
  );
}

export function ScheduleForm({
  campaignCreatorId,
  defaultDate,
}: {
  campaignCreatorId: string;
  defaultDate?: string;
}) {
  const [state, action, pending] = useActionState(scheduleCollabAction, initial);
  const dateValue = defaultDate
    ? new Date(defaultDate).toISOString().slice(0, 10)
    : "";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <Field
        label="Scheduled publish date"
        name="scheduled_publish_at"
        type="date"
        required
        defaultValue={dateValue}
      />
      <FormMessage error={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Scheduling…" : "Confirm schedule"}
      </button>
    </form>
  );
}

export function PublishUrlForm({
  campaignCreatorId,
}: {
  campaignCreatorId: string;
}) {
  const [state, action, pending] = useActionState(
    submitPublishedUrlAction,
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <Field
        label="Published LinkedIn post URL"
        name="published_url"
        type="url"
        required
        placeholder="https://www.linkedin.com/posts/…"
      />
      <FormMessage error={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit published URL"}
      </button>
    </form>
  );
}

export function CompleteCollabForm({
  campaignCreatorId,
}: {
  campaignCreatorId: string;
}) {
  return (
    <form action={completeCollabAction}>
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Mark collaboration complete
      </button>
    </form>
  );
}

export function CancelCollabForm({
  campaignCreatorId,
}: {
  campaignCreatorId: string;
}) {
  const [state, action, pending] = useActionState(cancelCollabAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaign_creator_id" value={campaignCreatorId} />
      <TextArea
        label="Cancellation reason"
        name="cancel_reason"
        required
        rows={3}
        placeholder="Why is this collaboration being cancelled?"
      />
      <FormMessage error={state.error} />
      <ConfirmButton
        confirmText="Cancel this collaboration? This cannot be undone."
        disabled={pending}
      >
        {pending ? "Cancelling…" : "Cancel collaboration"}
      </ConfirmButton>
    </form>
  );
}
