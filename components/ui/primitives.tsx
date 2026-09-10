import Link from "next/link";
import type { ReactNode } from "react";

const primaryBtn =
  "inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,box-shadow,opacity] duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryBtn =
  "inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-[background-color,border-color,opacity] duration-150 hover:bg-page disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "inline-flex items-center justify-center rounded-[12px] px-3 py-2 text-sm font-semibold text-ink-muted transition-[background-color,color,opacity] duration-150 hover:bg-page hover:text-ink disabled:cursor-not-allowed disabled:opacity-60";

const destructiveBtn =
  "inline-flex items-center justify-center rounded-[12px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-danger transition-[background-color,border-color,opacity] duration-150 hover:border-danger/30 hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryButton({
  children,
  pending,
  type = "submit",
}: {
  children: ReactNode;
  pending?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button type={type} disabled={pending} className={`w-full ${primaryBtn}`}>
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${primaryBtn} ${className}`}>
      {children}
    </Link>
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${secondaryBtn} ${className}`}>
      {children}
    </Link>
  );
}

export function QuietLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${quietBtn} ${className}`}>
      {children}
    </Link>
  );
}

export function DestructiveButton({
  children,
  pending,
  type = "submit",
}: {
  children: ReactNode;
  pending?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button type={type} disabled={pending} className={destructiveBtn}>
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  const light = className.includes("text-white") || className.includes("!text-white");
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${
        light ? "text-white" : "text-ink"
      } ${className}`}
    >
      <span className="inline-flex" aria-hidden>
        <svg
          className="h-7 w-7"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="32"
            height="32"
            rx="8"
            fill={light ? "rgba(255,255,255,0.14)" : "#1e4fd7"}
          />
          <path
            d="M9 21.5c0-5.2 3.4-9 8.2-9 1.9 0 3.5.5 4.8 1.4"
            stroke={light ? "#fff" : "#fff"}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M23 10.5c0 5.2-3.4 9-8.2 9-1.9 0-3.5-.5-4.8-1.4"
            stroke={light ? "rgba(255,255,255,0.55)" : "#c5d4f8"}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle
            cx="11.2"
            cy="12.2"
            r="1.55"
            fill={light ? "#fff" : "#fff"}
          />
          <circle
            cx="20.8"
            cy="19.8"
            r="1.55"
            fill={light ? "rgba(255,255,255,0.55)" : "#c5d4f8"}
          />
        </svg>
      </span>
      Naano
    </Link>
  );
}

const fieldClass =
  "w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent";

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  step,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  min?: number | string;
  step?: number | string;
  autoComplete?: string;
  hint?: string;
}) {
  const id = name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        id={id}
        className={fieldClass}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        step={step}
        autoComplete={autoComplete}
      />
      {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  name,
  rows = 3,
  required,
  placeholder,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
}) {
  const id = name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={`${fieldClass} resize-y`}
        defaultValue={defaultValue}
      />
      {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export { FormMessage } from "@/components/ui/form-message";

