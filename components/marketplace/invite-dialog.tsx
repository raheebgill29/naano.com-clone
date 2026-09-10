"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  formatPriceCents,
  initials,
} from "@/components/workspace/ui";
import { inviteCreatorToCampaign } from "@/lib/campaigns/actions";
import type { CampaignStatus } from "@/lib/supabase/database.types";
import { appToast } from "@/lib/toast";

type EligibleCampaign = {
  id: string;
  campaign_name: string;
  status: CampaignStatus;
};

type CreatorSummary = {
  id: string;
  full_name: string;
  headline: string;
  price_cents: number;
  currency: string;
};

function useDialogChrome(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return panelRef;
}

export function InviteToCampaignButton({
  creator,
  campaigns,
  preferredCampaignId,
  className = "",
}: {
  creator: CreatorSummary;
  campaigns: EligibleCampaign[];
  preferredCampaignId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const panelRef = useDialogChrome(open, () => setOpen(false));

  const options = (campaigns ?? []).filter(
    (c) => c.status === "draft" || c.status === "active",
  );
  const preferred =
    preferredCampaignId && options.some((c) => c.id === preferredCampaignId)
      ? preferredCampaignId
      : (options[0]?.id ?? "");
  const [selected, setSelected] = useState(preferred);
  const selectedId = options.some((c) => c.id === selected)
    ? selected
    : preferred;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await inviteCreatorToCampaign({}, formData);
      if (result.error) {
        appToast.error({
          title: result.error,
          id: `invite:${creator.id}:error`,
        });
        return;
      }
      if (result.success) {
        appToast.success({
          title: result.success,
          id: `invite:${creator.id}:success`,
        });
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={
          className ||
          "inline-flex flex-1 items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        Invite to campaign
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close invite dialog"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-[var(--shadow)] sm:rounded-[16px]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-ink">
                  Invite to campaign
                </h2>
                <p className="mt-0.5 text-sm text-support">
                  Send a booking invitation to this creator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line text-ink-subtle transition-colors duration-150 hover:bg-page hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="flex items-start gap-3 rounded-[12px] border border-line bg-page px-3.5 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {initials(creator.full_name) || "C"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {creator.full_name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-support">
                    {creator.headline}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold text-ink">
                  {formatPriceCents(creator.price_cents, creator.currency)}
                  <span className="block text-[11px] font-normal text-ink-subtle">
                    / post
                  </span>
                </p>
              </div>

              {options.length === 0 ? (
                <div className="mt-4 rounded-[12px] border border-dashed border-line-strong bg-page px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-ink">
                    No eligible campaigns
                  </p>
                  <p className="mt-1 text-sm text-support">
                    Create a draft or active campaign to invite creators.
                    Paused, completed, and archived campaigns are excluded.
                  </p>
                  <Link
                    href={`/brand/campaigns/new?inviteCreatorId=${creator.id}`}
                    className="mt-3 inline-flex rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                  >
                    Create campaign
                  </Link>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-4 space-y-4">
                  <input type="hidden" name="creator_id" value={creator.id} />
                  <fieldset>
                    <legend className="text-sm font-medium text-ink">
                      Eligible campaigns
                    </legend>
                    <ul className="mt-2 space-y-2">
                      {options.map((campaign) => (
                        <li key={campaign.id}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-3 transition-colors duration-150 ${
                              selectedId === campaign.id
                                ? "border-accent bg-accent-soft"
                                : "border-line hover:bg-page"
                            }`}
                          >
                            <input
                              type="radio"
                              name="campaign_id"
                              value={campaign.id}
                              checked={selectedId === campaign.id}
                              onChange={() => setSelected(campaign.id)}
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-ink">
                                {campaign.campaign_name}
                              </span>
                              <span className="mt-0.5 block text-xs capitalize text-support">
                                {campaign.status}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <Link
                      href={`/brand/campaigns/new?inviteCreatorId=${creator.id}`}
                      className="text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      Create new campaign
                    </Link>
                    <button
                      type="submit"
                      disabled={pending || !selectedId}
                      className="inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
                    >
                      {pending ? "Sending…" : "Send invitation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
