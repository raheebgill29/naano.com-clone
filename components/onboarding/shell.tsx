import type { ReactNode } from "react";

import { Wordmark } from "@/components/ui/primitives";

export function OnboardingLayout({
  title,
  subtitle,
  step,
  totalSteps = 2,
  stepLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps?: number;
  stepLabel: string;
  children: ReactNode;
}) {
  const progress = Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Wordmark />
          <p className="text-sm text-ink-muted">
            Step {step} of {totalSteps}
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            <span>{stepLabel}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

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
      </main>
    </div>
  );
}
