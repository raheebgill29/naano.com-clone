import Link from "next/link";

import { InviteToCampaignButton } from "@/components/marketplace/invite-dialog";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import {
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import type {
  CampaignStatus,
  MarketplaceCreator,
} from "@/lib/supabase/database.types";

type Campaigns = Array<{
  id: string;
  campaign_name: string;
  status: CampaignStatus;
}>;

function AvailabilityDot({ available }: { available: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          available ? "bg-success" : "bg-line-strong"
        }`}
      />
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

function MetaRow({ creator }: { creator: MarketplaceCreator }) {
  return (
    <p className="tnum flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-support">
      <span className="font-semibold text-ink-muted">
        {formatCompactCount(creator.audience_size)} followers
      </span>
      {creator.location ? (
        <>
          <span aria-hidden>·</span>
          <span>{creator.location}</span>
        </>
      ) : null}
      {creator.languages.length ? (
        <>
          <span aria-hidden>·</span>
          <span>{creator.languages.slice(0, 2).join(", ")}</span>
        </>
      ) : null}
    </p>
  );
}

function Topics({ topics, max = 3 }: { topics: string[]; max?: number }) {
  if (!topics.length) return null;
  const extra = topics.length - max;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {topics.slice(0, max).map((topic) => (
        <li
          key={topic}
          className="max-w-full truncate rounded-[6px] border border-line px-2 py-0.5 text-[11px] font-medium text-ink-muted"
        >
          {topic}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-[6px] px-1 py-0.5 text-[11px] text-ink-subtle">
          +{extra}
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Editorial marketplace card. `featured` renders a wide, portrait-led
 * variant used for the first result to vary grid rhythm.
 */
export function MarketplaceCreatorCard({
  creator,
  saved,
  campaigns,
  preferredCampaignId,
  undoableRemove = false,
  featured = false,
}: {
  creator: MarketplaceCreator;
  saved: boolean;
  campaigns: Campaigns;
  preferredCampaignId?: string;
  /** Enable undo toast when removing from shortlist */
  undoableRemove?: boolean;
  featured?: boolean;
}) {
  const href = `/brand/creators/${creator.slug}`;
  const available = creator.availability === "available";

  const inviteProps = {
    creator: {
      id: creator.id,
      full_name: creator.full_name,
      headline: creator.headline,
      price_cents: creator.price_cents,
      currency: creator.currency,
    },
    campaigns,
    preferredCampaignId,
  };

  const saveButton = (
    <SaveCreatorButton
      key={`${creator.id}:${saved ? "1" : "0"}`}
      creatorId={creator.id}
      initiallySaved={saved}
      variant="icon"
      undoableRemove={undoableRemove}
    />
  );

  if (featured) {
    return (
      <article className="group grid overflow-hidden rounded-[12px] border border-line bg-surface sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Link
          href={href}
          className="portrait relative block aspect-[4/3] sm:aspect-auto sm:min-h-[300px]"
        >
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="display absolute inset-0 flex items-center justify-center text-[4rem] text-ink-muted">
              {creator.full_name.charAt(0)}
            </span>
          )}
          <span className="absolute left-3 top-3 rounded-[6px] bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
            Featured
          </span>
        </Link>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityDot available={available} />
                {saved ? (
                  <span className="text-[11px] font-semibold text-accent">
                    Saved
                  </span>
                ) : null}
              </div>
              <Link
                href={href}
                className="display mt-1.5 block text-[1.75rem] leading-[1.1] text-ink hover:text-accent sm:text-[2rem]"
              >
                {creator.full_name}
              </Link>
            </div>
            {saveButton}
          </div>

          <p className="mt-2 text-[15px] leading-6 text-ink-muted">
            {creator.headline}
          </p>
          {creator.audience_summary ? (
            <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-support">
              {creator.audience_summary}
            </p>
          ) : null}

          <div className="mt-4 space-y-2.5">
            <MetaRow creator={creator} />
            <Topics topics={creator.topics} max={4} />
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
            <p className="tnum display text-[1.5rem] text-ink">
              {formatPriceCents(creator.price_cents, creator.currency)}
              <span className="ml-1 font-sans text-[12px] text-ink-subtle">
                per post
              </span>
            </p>
            <div className="w-full sm:w-auto sm:min-w-[12rem]">
              <InviteToCampaignButton
                key={preferredCampaignId ?? "default-campaign"}
                {...inviteProps}
              />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[12px] border border-line bg-surface transition-colors duration-150 hover:border-line-strong focus-within:border-accent/35">
      <Link href={href} className="portrait relative block aspect-[5/4]">
        {creator.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.avatar_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="display absolute inset-0 flex items-center justify-center text-[3.5rem] text-ink-muted">
            {creator.full_name.charAt(0)}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityDot available={available} />
              {saved ? (
                <span className="text-[11px] font-semibold text-accent">
                  Saved
                </span>
              ) : null}
            </div>
            <Link
              href={href}
              className="display mt-1 block truncate text-[1.375rem] leading-tight text-ink hover:text-accent"
            >
              {creator.full_name}
            </Link>
          </div>
          {saveButton}
        </div>

        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-muted">
          {creator.headline}
        </p>

        <div className="mt-3 space-y-2">
          <MetaRow creator={creator} />
          <Topics topics={creator.topics} />
        </div>

        <p className="tnum mt-auto pt-4 text-[15px] font-semibold text-ink">
          {formatPriceCents(creator.price_cents, creator.currency)}
          <span className="ml-1 text-[11px] font-normal text-ink-subtle">
            / post
          </span>
        </p>
      </div>

      <div className="border-t border-line p-3">
        <InviteToCampaignButton
          key={preferredCampaignId ?? "default-campaign"}
          {...inviteProps}
        />
      </div>
    </article>
  );
}

export function MarketplaceCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[12px] border border-line bg-surface">
      <div className="aspect-[5/4] animate-pulse bg-page" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-page" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-page" />
        <div className="h-3 w-full animate-pulse rounded bg-page" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-page" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded bg-page" />
          <div className="h-5 w-16 animate-pulse rounded bg-page" />
        </div>
      </div>
      <div className="border-t border-line p-3">
        <div className="h-10 w-full animate-pulse rounded-[10px] bg-page" />
      </div>
    </div>
  );
}
