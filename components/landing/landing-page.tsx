import Link from "next/link";

import {
  PrimaryLink,
  SecondaryLink,
  Wordmark,
} from "@/components/ui/primitives";

const creators = [
  {
    initials: "AM",
    name: "Aisha Malik",
    specialty: "B2B SaaS & PLG",
    followers: "48.2K",
    fit: 94,
    price: "$650",
    tone: "bg-blue-100 text-blue-800",
  },
  {
    initials: "JR",
    name: "Jordan Rhee",
    specialty: "DevTools & AI",
    followers: "31.5K",
    fit: 91,
    price: "$480",
    tone: "bg-sky-100 text-sky-800",
  },
  {
    initials: "NL",
    name: "Nora Lane",
    specialty: "RevOps & GTM",
    followers: "62.1K",
    fit: 88,
    price: "$820",
    tone: "bg-indigo-100 text-indigo-800",
  },
];

const steps = [
  {
    title: "Discover",
    body: "Browse priced LinkedIn creators by topic, audience, and fit—then shortlist the right voices.",
  },
  {
    title: "Collaborate",
    body: "Send a brief, book creators, review drafts, and move each collaboration through a clear status path.",
  },
  {
    title: "Measure",
    body: "See published posts, demo analytics, and payout status in one campaign workspace.",
  },
];

const stats = [
  { label: "Creators ready to book", value: "120+" },
  { label: "Avg. fit score", value: "91%" },
  { label: "Fixed post pricing", value: "100%" },
  { label: "Time to first brief", value: "< 1 day" },
];

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-page">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Wordmark />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex"
          >
            <a href="#marketplace" className="hover:text-ink">
              Marketplace
            </a>
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a href="#for-creators" className="hover:text-ink">
              For creators
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
            >
              Sign in
            </Link>
            <PrimaryLink href="/signup" className="!px-3.5 !py-2">
              Start free
            </PrimaryLink>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              For B2B teams
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
              The B2B LinkedIn Creator Marketplace.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
              Discover trusted LinkedIn creators, launch campaigns with clear
              briefs, and track collaboration from draft to published results—
              without chasing DMs.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryLink href="/signup">Launch a campaign</PrimaryLink>
              <SecondaryLink href="/signup">Join as a creator</SecondaryLink>
            </div>
          </div>

          <div
            id="marketplace"
            className="rounded-[var(--radius)] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5"
          >
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Marketplace preview
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Sample creators with fixed per-post pricing.
                </p>
              </div>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                Demo
              </span>
            </div>
            <ul className="space-y-3">
              {creators.map((creator) => (
                <li
                  key={creator.name}
                  className="flex items-center gap-3 rounded-xl border border-line bg-page/60 p-3"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${creator.tone}`}
                    aria-hidden
                  >
                    {creator.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="truncate text-sm font-semibold text-ink">
                        {creator.name}
                      </p>
                      <span className="text-xs font-medium text-accent">
                        {creator.fit}% fit
                      </span>
                    </div>
                    <p className="truncate text-xs text-ink-muted sm:text-sm">
                      {creator.specialty} · {creator.followers} followers
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink">
                    {creator.price}
                    <span className="block text-[11px] font-normal text-ink-subtle">
                      / post
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-label="Trust metrics"
          className="border-y border-line bg-surface"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16"
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              A focused workflow for brands and creators—built around
              discovery, collaboration, and measurable outcomes.
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[var(--radius)] border border-line bg-surface p-5 shadow-[var(--shadow)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="for-creators"
          className="border-t border-line bg-surface"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-16">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Built for creators who sell expertise
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-muted">
                Publish a priced LinkedIn profile, review brand briefs, submit
                drafts, and track payout status—without leaving the workflow.
              </p>
            </div>
            <SecondaryLink href="/signup" className="shrink-0 self-start">
              Create creator account
            </SecondaryLink>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="rounded-[var(--radius)] border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)] sm:px-10">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Ready to run your next LinkedIn campaign?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-ink-muted">
              Start free, choose Brand or Creator, and complete a short profile
              to enter your workspace.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryLink href="/signup">Start free</PrimaryLink>
              <SecondaryLink href="/login">Sign in</SecondaryLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-semibold text-ink">Naano</span>
            {" — "}
            B2B LinkedIn creator marketplace
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-ink">
              Sign up
            </Link>
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
