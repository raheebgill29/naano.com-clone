import Link from "next/link";

/** Purposeful Naano mark — connected arcs, not a letter in a blue square. */
export function BrandMark({
  className = "h-8 w-8",
  title = "Naano",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="8" fill="#1e4fd7" />
      <path
        d="M9 21.5c0-5.2 3.4-9 8.2-9 1.9 0 3.5.5 4.8 1.4"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M23 10.5c0 5.2-3.4 9-8.2 9-1.9 0-3.5-.5-4.8-1.4"
        stroke="#c5d4f8"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="11.2" cy="12.2" r="1.55" fill="#fff" />
      <circle cx="20.8" cy="19.8" r="1.55" fill="#c5d4f8" />
    </svg>
  );
}

export function BrandWordmark({
  href = "/",
  subtitle,
  className = "",
  markClassName = "h-8 w-8",
  ink = "dark",
  onClick,
}: {
  href?: string;
  subtitle?: string;
  className?: string;
  markClassName?: string;
  ink?: "dark" | "light";
  onClick?: () => void;
}) {
  const nameClass =
    ink === "light"
      ? "text-white"
      : "text-ink";
  const subClass =
    ink === "light"
      ? "text-white/70"
      : "text-support";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <BrandMark className={markClassName} />
      <span className="min-w-0">
        <span
          className={`block text-[15px] font-semibold tracking-tight ${nameClass}`}
        >
          Naano
        </span>
        {subtitle ? (
          <span className={`mt-0.5 block truncate text-[11px] font-medium ${subClass}`}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
