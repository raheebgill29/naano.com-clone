import Link from "next/link";
import type { ReactNode } from "react";

const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

const secondaryBtn =
  "inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-60";

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

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`text-lg font-semibold tracking-tight text-ink ${className}`}
    >
      Naano
    </Link>
  );
}

const fieldClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition hover:border-line-strong focus:border-accent";

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
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
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
      />
      {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  return (
    <p
      className={`rounded-lg px-3 py-2.5 text-sm ${
        error
          ? "border border-red-200 bg-danger-soft text-danger"
          : "border border-emerald-200 bg-success-soft text-success"
      }`}
      role="status"
      aria-live="polite"
    >
      {error ?? success}
    </p>
  );
}
