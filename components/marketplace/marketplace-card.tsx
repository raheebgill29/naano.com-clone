import Link from "next/link";

import { InviteToCampaignButton } from "@/components/marketplace/invite-dialog";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import {
  formatCompactCount,
  formatPriceCents,
  initials,
} from "@/components/workspace/ui";
import type {
  CampaignStatus,
  MarketplaceCreator,
} from "@/lib/supabase/database.types";

export function MarketplaceCreatorCard({
  creator,
  saved,
  campaigns,
}: {
  creator: MarketplaceCreator;
  saved: boolean;
  campaigns: Array<{
    id: string;
    campaign_name: string;
    status: CampaignStatus;
  }>;
}) {
  const href = `/brand/creators/${creator.slug}`;
  const available = creator.availability === "available";

  return (
    <article className="group flex h-full flex-col rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[var(--shadow)] focus-within:border-accent/40">
      <div className="relative">
        <div className="absolute right-0 top-0 z-10">
          <SaveCreatorButton
            key={`${creator.id}:${saved ? "1" : "0"}`}
            creatorId={creator.id}
            initiallySaved={saved}
            variant="icon"
          />
        </div>

        <Link
          href={href}
          className="block rounded-[12px] outline-none focus-visible:shadow-[var(--focus)]"
        >
          <div className="flex items-start gap-3 pr-11">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                initials(creator.full_name) || "C"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-ink group-hover:text-accent">
                  {creator.full_name}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    available
                      ? "bg-success-soft text-success"
                      : "bg-page text-support"
                  }`}
                >
                  {available ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-support">
                {creator.headline}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-support">
            <span className="font-medium text-ink-muted">
              {formatCompactCount(creator.audience_size)} followers
            </span>
            {creator.location ? <span>{creator.location}</span> : null}
            {creator.languages.length ? (
              <span>{creator.languages.slice(0, 2).join(", ")}</span>
            ) : null}
          </div>

          {creator.topics.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {creator.topics.slice(0, 3).map((topic) => (
                <li
                  key={topic}
                  className="rounded-[8px] bg-page px-2 py-1 text-xs font-medium text-ink-muted"
                >
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 h-7" aria-hidden />
          )}

          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-base font-semibold tracking-tight text-ink">
              {formatPriceCents(creator.price_cents, creator.currency)}
              <span className="ml-1 text-xs font-normal text-ink-subtle">
                / post
              </span>
            </p>
            <span className="text-xs font-semibold text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              View profile →
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-auto flex gap-2 border-t border-line pt-4">
        <InviteToCampaignButton
          creator={{
            id: creator.id,
            full_name: creator.full_name,
            headline: creator.headline,
            price_cents: creator.price_cents,
            currency: creator.currency,
          }}
          campaigns={campaigns}
        />
      </div>
    </article>
  );
}

export function MarketplaceCardSkeleton() {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-page" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-page" />
          <div className="h-3 w-full animate-pulse rounded bg-page" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-page" />
        </div>
      </div>
      <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-page" />
      <div className="mt-3 flex gap-2">
        <div className="h-7 w-16 animate-pulse rounded bg-page" />
        <div className="h-7 w-16 animate-pulse rounded bg-page" />
      </div>
      <div className="mt-auto border-t border-line pt-4">
        <div className="h-10 w-full animate-pulse rounded-[12px] bg-page" />
      </div>
    </div>
  );
}
