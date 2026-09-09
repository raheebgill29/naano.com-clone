import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/ui/primitives";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Wordmark />
          <Link
            href="/"
            className="text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-ink-muted">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
        ) : null}
      </main>
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

export {
  Field,
  FormMessage,
  PrimaryButton as SubmitButton,
  TextArea,
} from "@/components/ui/primitives";
