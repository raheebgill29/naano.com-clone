"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import { FormMessage } from "@/components/ui/form-message";
import type { CampaignStatus } from "@/lib/supabase/database.types";
import {
  inviteCreatorToCampaign,
  type InviteActionState,
} from "@/lib/campaigns/actions";

const initialState: InviteActionState = {};

export function InviteToCampaignForm({
  creatorId,
  campaigns,
}: {
  creatorId: string;
  campaigns: Array<{
    id: string;
    campaign_name: string;
    status: CampaignStatus;
  }>;
}) {
  const [state, formAction, pending] = useActionState(
    inviteCreatorToCampaign,
    initialState,
  );

  const options = useMemo(
    () => (campaigns ?? []).filter((c) => c.status !== "archived"),
    [campaigns],
  );

  const [selected, setSelected] = useState<string>(
    options[0]?.id ?? "__new__",
  );

  const canInvite = selected !== "__new__" && Boolean(options.length);

  return (
    <div className="space-y-2 text-left">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="creator_id" value={creatorId} />

        {options.length ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-support">
              Invite to campaign
            </span>
            <select
              name="campaign_id"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campaign_name} ({c.status})
                </option>
              ))}
              <option value="__new__">Create new draft campaign…</option>
            </select>
          </label>
        ) : (
          <p className="text-xs text-support">
            No eligible campaigns yet.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !canInvite}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Inviting…" : "Invite"}
          </button>
          {selected === "__new__" ? (
            <Link
              href={`/brand/campaigns/new?inviteCreatorId=${creatorId}`}
              className="text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Create draft
            </Link>
          ) : null}
        </div>

        <FormMessage error={state.error} success={state.success} />
      </form>
    </div>
  );
}
