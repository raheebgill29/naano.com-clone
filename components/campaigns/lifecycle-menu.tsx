"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { FormMessage } from "@/components/ui/form-message";
import {
  CAMPAIGN_ACTION_LABEL,
  CAMPAIGN_STATUS_EXPLANATION,
  CAMPAIGN_STATUS_LABEL,
  analyzeCampaignLifecycleBlockers,
  availableCampaignActions,
  campaignStatusBadgeClass,
  type CampaignLifecycleAction,
} from "@/lib/campaigns/status";
import {
  transitionCampaignAction,
  type CampaignFormActionState,
} from "@/lib/campaigns/actions";
import type { CampaignStatus } from "@/lib/supabase/database.types";
import { appToast } from "@/lib/toast";

const initial: CampaignFormActionState = {};

const CONFIRM_COPY: Partial<Record<CampaignLifecycleAction, string>> = {
  complete:
    "Mark this campaign complete? It will become read-only. You can archive it afterward.",
  archive:
    "Archive this campaign? It will leave the default list but history is kept. This cannot be undone from the product.",
};

export function CampaignLifecycleMenu({
  campaignId,
  status,
  invitations,
}: {
  campaignId: string;
  status: CampaignStatus;
  invitations: Array<{ id: string; status: string }>;
}) {
  const router = useRouter();
  const blockers = analyzeCampaignLifecycleBlockers(invitations);
  const actions = availableCampaignActions(status, blockers);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    transitionCampaignAction,
    initial,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const lastSuccess = useRef<string | null>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
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
  }, []);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      appToast.success({
        title: state.success,
        id: `campaign:${state.success}`,
      });
      setOpen(false);
      router.refresh();
    }
  }, [router, state.success]);

  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-[#f7f8fa] px-3 py-2 text-sm text-support">
        <span
          className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(status)}`}
        >
          {CAMPAIGN_STATUS_LABEL[status]}
        </span>
        {CAMPAIGN_STATUS_EXPLANATION[status]}
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${campaignStatusBadgeClass(status)}`}
        >
          {CAMPAIGN_STATUS_LABEL[status]}
        </span>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            disabled={pending}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
          >
            {pending ? "Updating…" : "Lifecycle"}
            <span aria-hidden className="text-ink-subtle">
              ▾
            </span>
          </button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow)]"
            >
              {actions.map((item) => (
                <form
                  key={item.action}
                  action={formAction}
                  className="block"
                  onSubmit={(event) => {
                    if (!item.enabled) {
                      event.preventDefault();
                      return;
                    }
                    const confirmText = CONFIRM_COPY[item.action];
                    if (item.requiresConfirm && confirmText) {
                      if (!window.confirm(confirmText)) {
                        event.preventDefault();
                      }
                    }
                  }}
                >
                  <input type="hidden" name="campaign_id" value={campaignId} />
                  <input type="hidden" name="action" value={item.action} />
                  <button
                    type="submit"
                    role="menuitem"
                    disabled={!item.enabled || pending}
                    title={item.reason}
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-sm font-semibold text-ink">
                      {CAMPAIGN_ACTION_LABEL[item.action]}
                    </span>
                    {item.reason ? (
                      <span className="mt-0.5 text-[11px] text-support">
                        {item.reason}
                      </span>
                    ) : null}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-support">
        {CAMPAIGN_STATUS_EXPLANATION[status]}
      </p>
      {(blockers.pendingInvitations > 0 ||
        blockers.activeCollaborations > 0) &&
      (status === "active" || status === "paused") ? (
        <p className="text-xs text-support">
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
      ) : null}
      <FormMessage error={state.error} />
    </div>
  );
}
