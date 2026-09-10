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
  const extraTopics = Math.max(0, creator.topics.length - 3);
  const shownTopics = creator.topics.slice(0, 3);

  return (
    <article className="rounded-[12px] border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-line-strong sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-0">
        {/* Identity */}
        <div className="flex min-w-0 flex-[1.15] gap-4 lg:pr-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-page text-base font-semibold text-ink-muted sm:h-[4.5rem] sm:w-[4.5rem] sm:text-lg">
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-accent-soft text-accent">
                {initials(creator.full_name) || "C"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={href}
                className="min-w-0 break-words text-base font-semibold tracking-tight text-ink transition-colors duration-150 hover:text-accent"
              >
                {creator.full_name}
              </Link>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  available
                    ? "bg-success-soft text-success"
                    : "bg-page text-support"
                }`}
              >
                {available ? "Available" : "Unavailable"}
              </span>
            </div>

            <p className="mt-1 max-w-xl text-sm leading-5 text-support line-clamp-2">
              {creator.headline}
            </p>

            {(creator.location || creator.languages.length > 0) && (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-subtle">
                {creator.location ? <span>{creator.location}</span> : null}
                {creator.languages.length ? (
                  <span>{creator.languages.slice(0, 3).join(", ")}</span>
                ) : null}
              </p>
            )}
          </div>
        </div>

        {/* Profile metadata */}
        <div className="min-w-0 flex-1 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:px-6 lg:pt-0">
          <div className="space-y-3.5">
            <div>
              <p className="text-[11px] font-medium text-ink-subtle">
                Followers
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatCompactCount(creator.audience_size)}
              </p>
            </div>

            {creator.audience_summary ? (
              <div>
                <p className="text-[11px] font-medium text-ink-subtle">
                  Audience
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-support">
                  {creator.audience_summary}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-medium text-ink-subtle">
                Specialties
              </p>
              {shownTopics.length ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {shownTopics.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-[8px] bg-page px-2 py-1 text-xs font-medium text-ink-muted"
                    >
                      {topic}
                    </li>
                  ))}
                  {extraTopics > 0 ? (
                    <li className="rounded-[8px] bg-page px-2 py-1 text-xs font-medium text-ink-subtle">
                      +{extraTopics}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-support">No specialties listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Price + actions */}
        <div className="flex min-w-0 flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between lg:w-[15rem] lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-between lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-ink-subtle">
                Price
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
                {formatPriceCents(creator.price_cents, creator.currency)}
              </p>
              <p className="text-xs text-ink-subtle">per post</p>
            </div>
            <SaveCreatorButton
              key={`${creator.id}:saved`}
              creatorId={creator.id}
              initiallySaved
              variant="icon"
              undoableRemove
            />
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:max-w-sm sm:grid-cols-2 lg:max-w-none lg:grid-cols-1">
            <InviteToCampaignButton
              creator={{
                id: creator.id,
                full_name: creator.full_name,
                headline: creator.headline,
                price_cents: creator.price_cents,
                currency: creator.currency,
              }}
              campaigns={campaigns}
              className="inline-flex w-full items-center justify-center rounded-[12px] bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
            />
            <Link
              href={href}
              className="inline-flex w-full items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-page"
            >
              View profile
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ShortlistCreatorCardSkeleton() {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        <div className="flex flex-1 gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-page sm:h-[4.5rem] sm:w-[4.5rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-page" />
            <div className="h-3 w-full max-w-md animate-pulse rounded bg-page" />
            <div className="h-3 w-32 animate-pulse rounded bg-page" />
          </div>
        </div>
        <div className="flex-1 space-y-3 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6">
          <div className="h-3 w-20 animate-pulse rounded bg-page" />
          <div className="h-4 w-16 animate-pulse rounded bg-page" />
          <div className="h-7 w-28 animate-pulse rounded bg-page" />
        </div>
        <div className="w-full space-y-3 border-t border-line pt-4 lg:w-[15rem] lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6">
          <div className="h-8 w-24 animate-pulse rounded bg-page" />
          <div className="h-10 w-full animate-pulse rounded-[12px] bg-page" />
          <div className="h-10 w-full animate-pulse rounded-[12px] bg-page" />
        </div>
      </div>
    </div>
  );
}
