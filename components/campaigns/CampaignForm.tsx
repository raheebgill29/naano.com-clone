"use client";

import { useActionState } from "react";

import { Field, FormMessage, TextArea } from "@/components/ui/primitives";
import type {
  Campaign,
  CampaignStatus,
} from "@/lib/supabase/database.types";
import { saveBrandCampaign, type CampaignFormActionState } from "@/lib/campaigns/actions";

const initialState: CampaignFormActionState = {};

function dateToInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CampaignForm({
  campaign,
  campaignId,
  inviteCreatorId,
}: {
  campaign?: Partial<Campaign>;
  campaignId?: string;
  inviteCreatorId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveBrandCampaign,
    initialState,
  );

  const defaultStatus = (campaign?.status as CampaignStatus | undefined) ?? "draft";
  const keyMessagesDefault = (campaign?.key_messages ?? []).join("\n");

  return (
    <form action={formAction} className="space-y-6">
      {campaignId ? (
        <input type="hidden" name="campaign_id" value={campaignId} />
      ) : null}
      {inviteCreatorId ? (
        <input
          type="hidden"
          name="invite_creator_id"
          value={inviteCreatorId}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Campaign name"
          name="campaign_name"
          required
          defaultValue={campaign?.campaign_name ?? ""}
          placeholder="Q4 Pipeline Gen"
        />
        <Field
          label="Product/company"
          name="product_or_company"
          required
          defaultValue={campaign?.product_or_company ?? ""}
          placeholder="Naano"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Objective"
          name="objective"
          required
          defaultValue={campaign?.objective ?? ""}
          placeholder="Drive inbound meetings"
        />
        <Field
          label="Deliverable type"
          name="deliverable_type"
          required
          defaultValue={campaign?.deliverable_type ?? ""}
          placeholder="LinkedIn feed post"
        />
      </div>

      <TextArea
        label="Description"
        name="description"
        rows={4}
        required
        defaultValue={campaign?.description ?? ""}
        placeholder="What should the post communicate?"
        hint="Brands will share this brief with invited creators."
      />

      <TextArea
        label="Key messages (one per line)"
        name="key_messages"
        rows={4}
        required
        defaultValue={keyMessagesDefault}
        placeholder={"Message 1\nMessage 2\nMessage 3"}
      />

      <TextArea
        label="Creator guidelines"
        name="creator_guidelines"
        rows={4}
        required
        defaultValue={campaign?.creator_guidelines ?? ""}
        placeholder="Tone, do/don’t, required angles, compliance notes…"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Number of posts"
          name="post_count"
          required
          type="number"
          min={1}
          defaultValue={campaign?.post_count?.toString() ?? ""}
          placeholder="1"
          hint="How many posts the brand agrees to."
        />
        <Field
          label="Target publish date"
          name="target_publish_date"
          required
          type="date"
          defaultValue={dateToInputValue(campaign?.target_publish_date)}
        />
        <Field
          label="Currency"
          name="currency"
          required
          defaultValue={campaign?.currency ?? "USD"}
          placeholder="USD"
        />
      </div>

      <Field
        label="Budget (cents)"
        name="budget_cents"
        required
        type="number"
        min={0}
        defaultValue={campaign?.budget_cents?.toString() ?? ""}
        placeholder="250000"
        hint="Budget for this campaign brief (demo: no payments)."
      />

      <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <legend className="text-sm font-semibold text-ink">
          Campaign status
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-page/50 p-3.5 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:checked]:bg-accent-soft">
            <input
              type="radio"
              name="status"
              value="draft"
              defaultChecked={defaultStatus === "draft"}
              className="mt-1"
            />
            <span className="text-sm font-semibold text-ink">Draft</span>
            <span className="text-xs text-ink-subtle">
              Editable and eligible for invites.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-page/50 p-3.5 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:checked]:bg-accent-soft">
            <input
              type="radio"
              name="status"
              value="active"
              defaultChecked={defaultStatus === "active"}
              className="mt-1"
            />
            <span className="text-sm font-semibold text-ink">Active</span>
            <span className="text-xs text-ink-subtle">
              Still editable until it moves out of draft.
            </span>
          </label>
        </div>
      </fieldset>

      <FormMessage error={state.error} success={state.success} />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : campaignId ? "Save changes" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

