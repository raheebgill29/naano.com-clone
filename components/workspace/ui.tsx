import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[12px] border border-line bg-surface px-4 py-3.5">
      <p className="text-[12px] font-medium text-support">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p> : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-line-strong bg-surface px-5 py-10 text-center">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-support">
        {description}
      </p>
      {action ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[12px] font-medium text-ink-subtle">{eyebrow}</p>
        ) : null}
        <h1
          className={`display text-[2rem] text-ink sm:text-[2.375rem] ${
            eyebrow ? "mt-1" : ""
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-support">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

/** Compact audience formatting, e.g. 12.4K */
export function formatCompactCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPriceCents(
  cents: number | null | undefined,
  currency = "USD",
) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Editorial portrait frame; falls back to initials on a warm tint. */
export function Portrait({
  src,
  name,
  className = "h-12 w-12",
  rounded = "rounded-[10px]",
  textClass = "text-sm",
}: {
  src?: string | null;
  name: string;
  className?: string;
  rounded?: string;
  textClass?: string;
}) {
  return (
    <span
      className={`portrait relative inline-flex shrink-0 items-center justify-center overflow-hidden ${rounded} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={`font-semibold text-ink-muted ${textClass}`}>
          {initials(name) || "C"}
        </span>
      )}
    </span>
  );
}

/** Section heading with optional trailing action; editorial rule above. */
export function SectionTitle({
  title,
  count,
  action,
  className = "",
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-t border-ink/80 pt-3 ${className}`}
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
        {title}
        {typeof count === "number" ? (
          <span className="ml-2 font-medium tracking-normal text-ink-subtle tnum">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}
