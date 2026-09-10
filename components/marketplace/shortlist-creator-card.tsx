import Link from "next/link";

import { InviteToCampaignButton } from "@/components/marketplace/invite-dialog";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import {
  Portrait,
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import type {
  CampaignStatus,
  MarketplaceCreator,
} from "@/lib/supabase/database.types";

/** One comparison row in the shortlist table. */
export function ShortlistCreatorCard({
  creator,
  campaigns,
}: {
  creator: MarketplaceCreator;
  campaigns: Array<{
    id: string;
    campaign_name: string;
    status: CampaignStatus;
  }>;
}) {
  const href = `/brand/creators/${creator.slug}`;
  const available = creator.availability === "available";
  const shownTopics = creator.topics.slice(0, 3);
  const extraTopics = Math.max(0, creator.topics.length - 3);

  return (
    <article className="grid gap-4 px-4 py-4 transition-colors hover:bg-page/40 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,4fr)] lg:items-center">
      {/* Identity */}
      <div className="flex min-w-0 gap-3.5">
        <Link href={href} className="shrink-0">
          <Portrait
            src={creator.avatar_url}
            name={creator.full_name}
            className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
            rounded="rounded-[10px]"
            textClass="text-lg"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={href}
              className="display min-w-0 truncate text-[1.25rem] leading-tight text-ink hover:text-accent"
            >
              {creator.full_name}
            </Link>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  available ? "bg-success" : "bg-line-strong"
                }`}
              />
              {available ? "Available" : "Unavailable"}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-ink-muted">
            {creator.headline}
          </p>
          {shownTopics.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {shownTopics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-[6px] border border-line px-2 py-0.5 text-[11px] font-medium text-ink-muted"
                >
                  {topic}
                </li>
              ))}
              {extraTopics > 0 ? (
                <li className="px-1 py-0.5 text-[11px] text-ink-subtle">
                  +{extraTopics}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Audience */}
      <div className="min-w-0 border-t border-line pt-3 lg:border-t-0 lg:pt-0">
        <p className="tnum text-[15px] font-semibold text-ink">
          {formatCompactCount(creator.audience_size)}
          <span className="ml-1 text-[11px] font-normal text-ink-subtle">
            followers
          </span>
        </p>
        <p className="mt-0.5 text-[12px] text-support">
          {[creator.location, creator.languages.slice(0, 2).join(", ")]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        {creator.audience_summary ? (
          <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-support">
            {creator.audience_summary}
          </p>
        ) : null}
      </div>

      {/* Rate */}
      <div className="border-t border-line pt-3 lg:border-t-0 lg:pt-0">
        <p className="display tnum text-[1.375rem] text-ink">
          {formatPriceCents(creator.price_cents, creator.currency)}
        </p>
        <p className="text-[11px] text-ink-subtle">per post</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-line pt-3 lg:justify-end lg:border-t-0 lg:pt-0">
        <div className="min-w-0 flex-1 lg:max-w-[13rem]">
          <InviteToCampaignButton
            creator={{
              id: creator.id,
              full_name: creator.full_name,
              headline: creator.headline,
              price_cents: creator.price_cents,
              currency: creator.currency,
            }}
            campaigns={campaigns}
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-ink px-3 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-ink-muted"
          />
        </div>
        <SaveCreatorButton
          key={`${creator.id}:saved`}
          creatorId={creator.id}
          initiallySaved
          variant="icon"
          undoableRemove
        />
      </div>
    </article>
  );
}

export function ShortlistCreatorCardSkeleton() {
  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,4fr)] lg:items-center">
      <div className="flex gap-3.5">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-[10px] bg-page sm:h-[4.5rem] sm:w-[4.5rem]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-page" />
          <div className="h-3 w-full max-w-md animate-pulse rounded bg-page" />
          <div className="h-3 w-32 animate-pulse rounded bg-page" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-page" />
        <div className="h-3 w-28 animate-pulse rounded bg-page" />
      </div>
      <div className="h-6 w-16 animate-pulse rounded bg-page" />
      <div className="flex justify-end gap-2">
        <div className="h-10 w-40 animate-pulse rounded-[10px] bg-page" />
        <div className="h-8 w-8 animate-pulse rounded-[10px] bg-page" />
      </div>
    </div>
  );
}
