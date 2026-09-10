import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatCompactCount,
  formatPriceCents,
  initials,
} from "@/components/workspace/ui";
import type { MarketplaceCreator } from "@/lib/supabase/database.types";

export function CreatorPublicCard({
  creator,
  href,
  actions,
  compact = false,
  preview = false,
}: {
  creator: Pick<
    MarketplaceCreator,
    | "full_name"
    | "headline"
    | "topics"
    | "audience_size"
    | "location"
    | "price_cents"
    | "currency"
    | "availability"
    | "languages"
    | "bio"
    | "audience_summary"
  > & {
    avatar_url?: string | null;
  };
  href?: string;
  actions?: ReactNode;
  compact?: boolean;
  /** Softer empty placeholders for live editor preview */
  preview?: boolean;
}) {
  const name = creator.full_name.trim() || (preview ? "Add your name" : "Creator");
  const headline =
    creator.headline.trim() || (preview ? "Add a headline" : "");
  const hasPrice = creator.price_cents > 0 || !preview;

  const content = (
    <>
      <div className="flex items-start gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-page text-sm font-semibold text-ink-muted">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-accent-soft text-accent">
              {initials(name) || "C"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`truncate text-sm font-semibold ${
                creator.full_name.trim() ? "text-ink" : "text-ink-subtle"
              }`}
            >
              {name}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                creator.availability === "available"
                  ? "bg-success-soft text-success"
                  : "bg-page text-support"
              }`}
            >
              {creator.availability === "available"
                ? "Available"
                : "Unavailable"}
            </span>
          </div>
          <p
            className={`mt-0.5 line-clamp-2 text-sm ${
              creator.headline.trim() ? "text-support" : "text-ink-subtle"
            }`}
          >
            {headline || "—"}
          </p>
        </div>
        <p className="shrink-0 text-right text-sm font-semibold text-ink">
          {hasPrice
            ? formatPriceCents(creator.price_cents, creator.currency)
            : preview
              ? "Set price"
              : formatPriceCents(0, creator.currency)}
          <span className="block text-[11px] font-normal text-ink-subtle">
            / post
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-support">
        <span>
          {creator.audience_size > 0
            ? `${formatCompactCount(creator.audience_size)} followers`
            : preview
              ? "Add followers"
              : "0 followers"}
        </span>
        {creator.location ? (
          <span>{creator.location}</span>
        ) : preview ? (
          <span className="text-ink-subtle">Add location</span>
        ) : null}
        {creator.languages.length ? (
          <span>{creator.languages.slice(0, 3).join(", ")}</span>
        ) : null}
      </div>

      {creator.topics.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {creator.topics.slice(0, compact ? 3 : 6).map((topic) => (
            <li
              key={topic}
              className="rounded-[8px] bg-page px-2 py-1 text-xs font-medium text-ink-muted"
            >
              {topic}
            </li>
          ))}
        </ul>
      ) : preview ? (
        <p className="mt-3 text-xs text-ink-subtle">Add specialties</p>
      ) : null}

      {!compact && (creator.bio || creator.audience_summary) ? (
        <p className="mt-3 line-clamp-3 text-sm text-support">
          {creator.audience_summary || creator.bio}
        </p>
      ) : null}
    </>
  );

  return (
    <article className="rounded-[12px] border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-line-strong">
      {href ? (
        <Link href={href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
      {actions ? <div className="mt-4 border-t border-line pt-4">{actions}</div> : null}
    </article>
  );
}
