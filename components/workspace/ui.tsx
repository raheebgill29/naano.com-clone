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
    <article className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <p className="text-sm font-medium text-support">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p> : null}
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
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-support">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center gap-3">{action}</div> : null}
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-sm font-medium text-support">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-support">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
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
