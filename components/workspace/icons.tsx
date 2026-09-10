import type { NavIcon } from "@/components/workspace/nav";

const base = "h-5 w-5 shrink-0";

export function BellIcon({ className = base }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6.8 9.5a5.2 5.2 0 0 1 10.4 0c0 5.4 2.1 6.2 2.1 6.2H4.7s2.1-.8 2.1-6.2Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2.3 2.3 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavGlyph({
  name,
  className = "",
}: {
  name: NavIcon;
  className?: string;
}) {
  const cls = `${base} ${className}`;
  switch (name) {
    case "overview":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "card":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M8 10h8M8 14h5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "marketplace":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="m16 16 3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "shortlist":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20s-6.5-4.1-6.5-9.1A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 6.5 2.7C18.5 15.9 12 20 12 20Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "campaigns":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 19V6.8A1.8 1.8 0 0 1 6.8 5H14l5 5v9a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 19Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M14 5v5h5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    case "opportunities":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 7h11l-1.2 11.2A2 2 0 0 1 15.8 20H8.2A2 2 0 0 1 6.2 18.2L5 7h3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case "collaborations":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="16" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M4.5 18.5c.7-2.4 2.7-3.5 4.5-3.5s3.8 1.1 4.5 3.5M13.5 15.2c.7-.4 1.6-.7 2.5-.7 1.6 0 3 .8 3.7 2.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "messages":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8A1.5 1.5 0 0 1 17.5 16H10l-4 3v-3H6.5A1.5 1.5 0 0 1 5 14.5v-8Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}
