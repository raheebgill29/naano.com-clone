import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/ui/primitives";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  mode = "login",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  mode?: "login" | "signup";
}) {
  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-full flex-1 flex-col lg:grid lg:grid-cols-2">
      <AuthVisualPanel mode={mode} />

      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#f6f5f2]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 70% 18%, rgb(29 78 216 / 8%), transparent 60%), radial-gradient(ellipse 50% 40% at 15% 85%, rgb(29 78 216 / 5%), transparent 55%)",
          }}
        />

        <main
          className={`relative mx-auto flex w-full max-w-[32.5rem] flex-1 flex-col justify-center px-4 sm:px-6 ${
            isSignup
              ? "py-8 lg:py-10"
              : "py-12 sm:py-16 lg:py-12"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <div className="lg:hidden">
              <Wordmark />
            </div>
            <Link
              href="/"
              className="ml-auto text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              ← Back to home
            </Link>
          </div>

          <div className="auth-form-enter rounded-[22px] border border-line bg-surface px-6 py-11 shadow-[0_1px_2px_rgb(15_23_42/4%),0_8px_24px_rgb(15_23_42/6%),0_24px_48px_rgb(15_23_42/4%)] sm:px-12 sm:py-12">
            <div className="auth-stagger-1 mb-7 sm:mb-8">
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-ink sm:text-[1.875rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2.5 text-[0.9375rem] leading-6 text-support">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="auth-stagger-2">{children}</div>

            {footer ? (
              <div className="auth-stagger-3 mt-7 border-t border-line pt-5 text-center text-sm text-support sm:mt-8">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function AuthVisualPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <aside className="relative overflow-hidden border-b border-line bg-[#0b1220] text-white lg:min-h-full lg:border-b-0 lg:border-r">
      {/* Soft branded atmosphere — restrained, not decorative glass */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgb(29 78 216 / 35%), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgb(14 165 233 / 18%), transparent 50%), linear-gradient(165deg, #0b1220 0%, #111827 55%, #0f172a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl auth-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-20 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl auth-float-delayed"
        aria-hidden
      />

      {/* Mobile compact brand strip */}
      <div className="relative px-4 py-5 sm:px-6 lg:hidden">
        <p className="text-sm font-semibold tracking-tight text-white">
          Naano
        </p>
        <p className="mt-1 max-w-md text-sm leading-5 text-slate-300">
          {mode === "signup"
            ? "Join brands and creators running LinkedIn collaborations with clear pricing."
            : "Discover creators, run campaigns, and close collaborations in one workspace."}
        </p>
      </div>

      {/* Desktop visual narrative */}
      <div className="relative hidden h-full min-h-[100dvh] flex-col justify-between px-10 py-12 lg:flex xl:px-14">
        <div>
          <Wordmark className="!text-white" />
          <h2 className="mt-10 max-w-md text-3xl font-semibold tracking-tight text-white xl:text-[2rem] xl:leading-tight">
            Professional influence, booked with clarity.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
            Discover LinkedIn creators, launch campaigns, and manage
            collaborations from draft to published post.
          </p>
        </div>

        <div className="relative mt-12 space-y-4">
          <FloatingCard
            className="auth-float max-w-sm"
            eyebrow="Marketplace"
            title="Creators with fixed post pricing"
            meta="Fit · Audience · Availability"
          />
          <FloatingCard
            className="auth-float-delayed ml-8 max-w-sm"
            eyebrow="Campaign"
            title="Brief → invite → review → publish"
            meta="One workflow for every collaboration"
          />
          <FloatingCard
            className="auth-float max-w-xs"
            eyebrow="Results"
            title="Measurable professional reach"
            meta="Published posts stay auditable"
          />
        </div>

        <p className="mt-10 text-xs font-medium tracking-wide text-slate-400">
          Built for B2B teams and LinkedIn creators
        </p>
      </div>
    </aside>
  );
}

function FloatingCard({
  eyebrow,
  title,
  meta,
  className = "",
}: {
  eyebrow: string;
  title: string;
  meta: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-white/10 bg-white/5 p-4 shadow-[0_8px_30px_rgb(0_0_0/20%)] backdrop-blur-[2px] ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sky-300">
        {eyebrow}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{meta}</p>
    </div>
  );
}

/** @deprecated Prefer AuthLayout — kept as thin alias for existing imports */
export function AuthShell(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return <AuthLayout {...props} />;
}

const authInputClass =
  "auth-input w-full rounded-[14px] border border-line bg-surface px-4 text-[0.9375rem] text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:bg-page disabled:text-ink-muted";

export function AuthField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  autoComplete,
  hint,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
}) {
  const id = name;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        id={id}
        className={`${authInputClass} h-14`}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthSubmitButton({
  children,
  pending,
}: {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-14 w-full items-center justify-center rounded-[14px] bg-accent px-4 text-[0.9375rem] font-semibold text-white shadow-[0_1px_2px_rgb(29_78_216/20%)] transition-[background-color,box-shadow,transform,opacity] duration-150 hover:bg-accent-hover hover:shadow-[0_4px_12px_rgb(29_78_216/25%)] active:translate-y-px active:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function AuthTrustLine() {
  return (
    <p className="mt-4 text-center text-xs leading-5 text-ink-subtle">
      Secured with encrypted authentication. Your role stays private to your
      workspace.
    </p>
  );
}

export {
  Field,
  FormMessage,
  PrimaryButton as SubmitButton,
  TextArea,
} from "@/components/ui/primitives";
