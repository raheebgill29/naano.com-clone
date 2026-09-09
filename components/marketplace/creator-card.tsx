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
  >;
  href?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {initials(creator.full_name) || "C"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink">
              {creator.full_name}
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

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-support">
        <span>{formatCompactCount(creator.audience_size)} followers</span>
        {creator.location ? <span>{creator.location}</span> : null}
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
      ) : null}

      {!compact && creator.audience_summary ? (
        <p className="mt-3 text-sm text-support">{creator.audience_summary}</p>
      ) : null}
    </>
  );

  return (
    <article className="rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[var(--shadow)]">
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
