"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { TagInput, tagsToCsv } from "@/components/ui/tag-input";
import { FormMessage } from "@/components/ui/primitives";
import { initials } from "@/components/workspace/ui";
import {
  publishCreatorCard,
  saveCreatorCardDraft,
  unpublishCreatorCard,
  type CreatorCardActionState,
} from "@/lib/creators/actions";
import { getPublishRequirements } from "@/lib/creators/card";
import { appToast } from "@/lib/toast";
import type { Creator, Profile } from "@/lib/supabase/database.types";

const initialState: CreatorCardActionState = {};

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

type SectionId = "profile" | "audience" | "offer";

function centsToMajor(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function majorToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatFollowersInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

function parseFollowersInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function isValidLinkedInUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return /(^|\.)linkedin\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function CreatorCardEditor({
  profile,
  creator,
}: {
  profile: Profile;
  creator: Creator | null;
}) {
  const [draftState, draftAction, draftPending] = useActionState(
    saveCreatorCardDraft,
    initialState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishCreatorCard,
    initialState,
  );
  const [unpublishMessage, setUnpublishMessage] =
    useState<CreatorCardActionState>({});
  const [unpublishPending, setUnpublishPending] = useState(false);

  const initialSnapshot = useMemo(
    () => ({
      fullName: profile.full_name,
      headline: creator?.headline ?? "",
      bio: creator?.bio ?? "",
      linkedinUrl: creator?.linkedin_url ?? "",
      location: creator?.location ?? "",
      languages: creator?.languages ?? [],
      topics: creator?.topics ?? [],
      audienceSummary: creator?.audience_summary ?? "",
      audienceSize: creator?.audience_size?.toString() ?? "",
      priceCents: creator?.price_cents ?? null,
      currency: creator?.currency ?? "USD",
      availability: (creator?.availability ?? "available") as
        | "available"
        | "unavailable",
    }),
    [profile, creator],
  );

  const [fullName, setFullName] = useState(initialSnapshot.fullName);
  const [headline, setHeadline] = useState(initialSnapshot.headline);
  const [bio, setBio] = useState(initialSnapshot.bio);
  const [linkedinUrl, setLinkedinUrl] = useState(initialSnapshot.linkedinUrl);
  const [location, setLocation] = useState(initialSnapshot.location);
  const [languages, setLanguages] = useState(initialSnapshot.languages);
  const [topics, setTopics] = useState(initialSnapshot.topics);
  const [audienceSummary, setAudienceSummary] = useState(
    initialSnapshot.audienceSummary,
  );
  const [audienceSizeDisplay, setAudienceSizeDisplay] = useState(
    initialSnapshot.audienceSize
      ? Number(initialSnapshot.audienceSize).toLocaleString("en-US")
      : "",
  );
  const [priceMajor, setPriceMajor] = useState(
    centsToMajor(initialSnapshot.priceCents),
  );
  const [currency, setCurrency] = useState(initialSnapshot.currency);
  const [availability, setAvailability] = useState(initialSnapshot.availability);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  const overflowRef = useRef<HTMLDivElement>(null);
  const lastToast = useRef<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const headlineRef = useRef<HTMLInputElement>(null);
  const followersRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const audienceSize = parseFollowersInput(audienceSizeDisplay);
  const priceCents = majorToCents(priceMajor);
  const linkedinError =
    linkedinUrl.trim() && !isValidLinkedInUrl(linkedinUrl)
      ? "Enter a valid LinkedIn profile URL (linkedin.com)."
      : null;

  const gate = getPublishRequirements({
    fullName,
    headline,
    topics,
    audienceSize,
    priceCents,
    currency,
  });

  const status = creator?.publication_status ?? "draft";
  const published = status === "published";
  const statusLabel = published
    ? "Published"
    : gate.ready
      ? "Draft"
      : "Incomplete";
  const publicPath =
    published && creator?.slug ? `/brand/creators/${creator.slug}` : null;

  const dirty =
    fullName !== initialSnapshot.fullName ||
    headline !== initialSnapshot.headline ||
    bio !== initialSnapshot.bio ||
    linkedinUrl !== initialSnapshot.linkedinUrl ||
    location !== initialSnapshot.location ||
    tagsToCsv(languages) !== tagsToCsv(initialSnapshot.languages) ||
    tagsToCsv(topics) !== tagsToCsv(initialSnapshot.topics) ||
    audienceSummary !== initialSnapshot.audienceSummary ||
    String(audienceSize ?? "") !== String(initialSnapshot.audienceSize || "") ||
    priceCents !== initialSnapshot.priceCents ||
    currency !== initialSnapshot.currency ||
    availability !== initialSnapshot.availability;

  const pending = draftPending || publishPending || unpublishPending;
  const completionMet = gate.requirements.filter((r) => r.met).length;
  const completionTotal = gate.requirements.length;
  const completionPct = Math.round((completionMet / completionTotal) * 100);
  const missing = gate.requirements.filter((r) => !r.met);

  const feedback =
    publishState.error || publishState.success
      ? publishState
      : draftState.error || draftState.success
        ? draftState
        : unpublishMessage;

  useEffect(() => {
    const key = `${feedback.error ?? ""}|${feedback.success ?? ""}`;
    if (!feedback.error && !feedback.success) return;
    if (lastToast.current === key) return;
    lastToast.current = key;
    if (feedback.error) {
      appToast.error({
        title: feedback.error,
        description: feedback.missing?.length
          ? `Missing: ${feedback.missing.join(", ")}`
          : undefined,
        id: `card-editor:${key}`,
      });
      if (!fullName.trim()) nameRef.current?.focus();
      else if (!headline.trim()) headlineRef.current?.focus();
      else if (!topics.length)
        document.getElementById("card-topics-input")?.focus();
      else if (audienceSize == null) followersRef.current?.focus();
      else if (priceCents == null) priceRef.current?.focus();
    } else if (feedback.success) {
      appToast.success({
        title: feedback.success,
        id: `card-editor:${key}`,
      });
    }
  }, [
    feedback,
    fullName,
    headline,
    topics.length,
    audienceSize,
    priceCents,
  ]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!overflowOpen) return;
    function onPointer(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOverflowOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [overflowOpen]);

  useEffect(() => {
    const sections: SectionId[] = ["profile", "audience", "offer"];
    const observers: IntersectionObserver[] = [];
    for (const id of sections) {
      const el = document.getElementById(`card-section-${id}`);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function focusFirstInvalid() {
    if (!fullName.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!headline.trim()) {
      headlineRef.current?.focus();
      return;
    }
    if (!topics.length) {
      document.getElementById("card-topics-input")?.focus();
      return;
    }
    if (audienceSize == null) {
      followersRef.current?.focus();
      return;
    }
    if (priceCents == null) {
      priceRef.current?.focus();
    }
  }

  function onDraftSubmit(event: FormEvent<HTMLFormElement>) {
    if (linkedinError) {
      event.preventDefault();
      appToast.error({ title: linkedinError, id: "card-linkedin" });
    }
  }

  function onPublishSubmit(event: FormEvent<HTMLFormElement>) {
    if (linkedinError) {
      event.preventDefault();
      appToast.error({ title: linkedinError, id: "card-linkedin" });
      return;
    }
    if (!gate.ready) {
      event.preventDefault();
      appToast.error({
        title: "Complete the required fields before publishing.",
        description: `Missing: ${gate.missing.join(", ")}`,
        id: "card-publish-gate",
      });
      focusFirstInvalid();
    }
  }

  async function onUnpublish() {
    if (
      !window.confirm(
        "Unpublish your card? It will be hidden from the marketplace until you publish again.",
      )
    ) {
      return;
    }
    setUnpublishPending(true);
    const result = await unpublishCreatorCard();
    setUnpublishMessage(result);
    setUnpublishPending(false);
    setOverflowOpen(false);
  }

  const sharedHidden = (
    <>
      <input type="hidden" name="full_name" value={fullName} />
      <input type="hidden" name="headline" value={headline} />
      <input type="hidden" name="bio" value={bio} />
      <input type="hidden" name="linkedin_url" value={linkedinUrl} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="languages" value={tagsToCsv(languages)} />
      <input type="hidden" name="topics" value={tagsToCsv(topics)} />
      <input type="hidden" name="audience_summary" value={audienceSummary} />
      <input
        type="hidden"
        name="audience_size"
        value={audienceSize == null ? "" : String(audienceSize)}
      />
      <input
        type="hidden"
        name="price_cents"
        value={priceCents == null ? "" : String(priceCents)}
      />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="availability" value={availability} />
    </>
  );

  const previewCard = (
    <CreatorPublicCard
      preview
      creator={{
        full_name: fullName,
        headline,
        topics,
        audience_size: audienceSize ?? 0,
        location: location || null,
        price_cents: priceCents ?? 0,
        currency: currency || "USD",
        availability,
        languages,
        bio: bio || null,
        audience_summary: audienceSummary || null,
        avatar_url: profile.avatar_url,
      }}
    />
  );

  return (
    <div className="space-y-5 pb-28 lg:pb-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">
          My card
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Build your creator profile
              </h1>
              <StatusBadge label={statusLabel} kind={statusLabel} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-support">
              This information controls how brands discover you in the
              marketplace.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-1.5 w-32 overflow-hidden rounded-full bg-page"
                role="progressbar"
                aria-valuenow={completionPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completion"
              >
                <div
                  className={`h-full rounded-full ${gate.ready ? "bg-success" : "bg-accent"}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-support">
                {completionMet}/{completionTotal} required
                {dirty ? " · Unsaved changes" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page lg:hidden"
              onClick={() => setPreviewOpen(true)}
            >
              Preview as brand
            </button>
            <button
              type="button"
              className="hidden items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page lg:inline-flex"
              onClick={() =>
                document
                  .getElementById("brand-preview-panel")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Preview as brand
            </button>
            {publicPath ? (
              <>
                <ShareActions path={publicPath} />
              </>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        aria-label="Card sections"
        className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-page/95 px-1 py-2 backdrop-blur-sm lg:static lg:bg-transparent lg:backdrop-blur-none"
      >
        {(
          [
            ["profile", "Profile"],
            ["audience", "Audience"],
            ["offer", "Offer"],
          ] as const
        ).map(([id, label]) => (
          <a
            key={id}
            href={`#card-section-${id}`}
            className={`shrink-0 rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors ${
              activeSection === id
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink hover:bg-page"
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <div className="min-w-0 space-y-5">
          <section
            id="card-section-profile"
            className="scroll-mt-24 rounded-[12px] border border-line bg-surface p-4 sm:p-5"
          >
            <h2 className="text-base font-semibold text-ink">Profile</h2>
            <p className="mt-1 text-sm text-support">
              Name, headline, and positioning for discovery.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-semibold text-accent">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(fullName) || "C"
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Portrait</p>
                <p className="mt-0.5 text-xs text-support">
                  From your account photo when set.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <FieldLabel label="Display name" required>
                <input
                  ref={nameRef}
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </FieldLabel>
              <FieldLabel label="Professional headline" required>
                <input
                  ref={headlineRef}
                  className={inputClass}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex: B2B SaaS creator helping marketers scale"
                />
              </FieldLabel>
              <FieldLabel
                label="Bio"
                hint={`${bio.length} characters`}
              >
                <textarea
                  rows={5}
                  className={inputClass}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your positioning and the collaborations you do best."
                />
              </FieldLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label="Location">
                  <input
                    className={inputClass}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Berlin, Germany"
                  />
                </FieldLabel>
                <FieldLabel
                  label="LinkedIn URL"
                  error={linkedinError}
                >
                  <input
                    type="url"
                    className={inputClass}
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/…"
                  />
                </FieldLabel>
              </div>
            </div>
          </section>

          <section
            id="card-section-audience"
            className="scroll-mt-24 rounded-[12px] border border-line bg-surface p-4 sm:p-5"
          >
            <h2 className="text-base font-semibold text-ink">Audience</h2>
            <p className="mt-1 text-sm text-support">
              Help brands understand who you reach and what you cover.
            </p>
            <div className="mt-5 space-y-4">
              <FieldLabel label="Follower count" required>
                <input
                  ref={followersRef}
                  inputMode="numeric"
                  className={inputClass}
                  value={audienceSizeDisplay}
                  onChange={(e) =>
                    setAudienceSizeDisplay(formatFollowersInput(e.target.value))
                  }
                  placeholder="12,500"
                />
              </FieldLabel>
              <TagInput
                id="card-languages-input"
                label="Languages"
                tags={languages}
                onChange={setLanguages}
                placeholder="English, German"
                hint="Press Enter or comma to add."
              />
              <TagInput
                id="card-topics-input"
                label="Specialties / topics"
                required
                tags={topics}
                onChange={setTopics}
                placeholder="saas, marketing, ai"
                hint="Press Enter or comma to add. At least one is required to publish."
              />
              <FieldLabel
                label="Target audience"
                hint="Roles, industries, or regions you typically reach."
              >
                <input
                  className={inputClass}
                  value={audienceSummary}
                  onChange={(e) => setAudienceSummary(e.target.value)}
                  placeholder="B2B SaaS marketers, US/EU"
                />
              </FieldLabel>
            </div>
          </section>

          <section
            id="card-section-offer"
            className="scroll-mt-24 rounded-[12px] border border-line bg-surface p-4 sm:p-5"
          >
            <h2 className="text-base font-semibold text-ink">Offer</h2>
            <p className="mt-1 text-sm text-support">
              The price brands see before inviting you to a campaign.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <span className="text-sm font-medium text-ink">
                  Price per post <span className="text-danger">*</span>
                </span>
                <div className="mt-1.5 flex overflow-hidden rounded-[12px] border border-line focus-within:border-accent">
                  <select
                    aria-label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="border-r border-line bg-page px-3 text-sm font-semibold text-ink"
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                    {!CURRENCIES.includes(
                      currency as (typeof CURRENCIES)[number],
                    ) ? (
                      <option value={currency}>{currency}</option>
                    ) : null}
                  </select>
                  <input
                    ref={priceRef}
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-surface px-3 py-2.5 text-sm text-ink outline-none"
                    value={priceMajor}
                    onChange={(e) => setPriceMajor(e.target.value)}
                    placeholder="250"
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  Saved as what brands see before inviting. Stored securely in
                  cents.
                </p>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-ink">
                  Availability
                </legend>
                <div
                  className="mt-2 inline-flex rounded-[12px] border border-line bg-page p-1"
                  role="group"
                  aria-label="Availability"
                >
                  {(
                    [
                      ["available", "Available"],
                      ["unavailable", "Unavailable"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAvailability(value)}
                      className={`rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors ${
                        availability === value
                          ? value === "available"
                            ? "bg-success-soft text-success"
                            : "bg-surface text-ink"
                          : "text-support hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          {(feedback.error || feedback.success) && (
            <FormMessage
              error={
                feedback.error
                  ? feedback.missing?.length
                    ? `${feedback.error} Missing: ${feedback.missing.join(", ")}.`
                    : feedback.error
                  : undefined
              }
              success={feedback.success}
            />
          )}
        </div>

        <aside
          id="brand-preview-panel"
          className="hidden min-w-0 space-y-4 lg:block"
        >
          <div className="sticky top-20 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Marketplace preview</h2>
              <p className="mt-1 text-sm text-support">
                Public listing as brands see it.
              </p>
            </div>
            {previewCard}
            <ReadinessCard ready={gate.ready} missing={missing} />
            {publicPath ? (
              <PublicLinkControl path={publicPath} />
            ) : (
              <p className="text-sm text-support">
                Publish your card to unlock a public link brands can open.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-[var(--shadow)] backdrop-blur-sm lg:static lg:z-auto lg:mt-2 lg:rounded-[12px] lg:border lg:bg-surface lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-support">
            {dirty ? "Unsaved changes" : "All changes saved"}
            {pending ? " · Saving…" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <form action={draftAction} onSubmit={onDraftSubmit}>
              {sharedHidden}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
              >
                {draftPending ? "Saving…" : "Save draft"}
              </button>
            </form>
            <form action={publishAction} onSubmit={onPublishSubmit}>
              {sharedHidden}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {publishPending
                  ? published
                    ? "Updating…"
                    : "Publishing…"
                  : published
                    ? "Update published card"
                    : "Publish card"}
              </button>
            </form>
            {published ? (
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={overflowOpen}
                  aria-label="More card actions"
                  onClick={() => setOverflowOpen((v) => !v)}
                  className="inline-flex h-[42px] w-10 items-center justify-center rounded-[12px] border border-line-strong bg-surface text-ink hover:bg-page"
                >
                  ⋯
                </button>
                {overflowOpen ? (
                  <div
                    role="menu"
                    className="absolute bottom-full right-0 z-40 mb-2 w-48 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)] lg:bottom-auto lg:top-full lg:mb-0 lg:mt-2"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={pending}
                      onClick={() => void onUnpublish()}
                      className="flex w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-page disabled:opacity-60"
                    >
                      {unpublishPending ? "Unpublishing…" : "Unpublish card"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-[16px] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:max-w-md sm:rounded-[16px]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">Brand preview</h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-[10px] border border-line px-2.5 py-1.5 text-sm font-semibold text-ink"
              >
                Close
              </button>
            </div>
            {previewCard}
            <div className="mt-4">
              <ReadinessCard ready={gate.ready} missing={missing} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-[border-color] duration-150 hover:border-line-strong focus:border-accent";

function FieldLabel({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="block text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

function StatusBadge({
  label,
  kind,
}: {
  label: string;
  kind: "Published" | "Draft" | "Incomplete";
}) {
  const tone =
    kind === "Published"
      ? "bg-success-soft text-success"
      : kind === "Draft"
        ? "bg-accent-soft text-accent"
        : "bg-warning-soft text-warning";
  return (
    <span
      className={`inline-flex rounded-[8px] px-2.5 py-1 text-[11px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

function ReadinessCard({
  ready,
  missing,
}: {
  ready: boolean;
  missing: Array<{ id: string; label: string }>;
}) {
  return (
    <section className="rounded-[12px] border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink">Profile readiness</h3>
      {ready ? (
        <p className="mt-2 text-sm font-medium text-success">
          Ready to publish.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-support">
          {missing.map((item) => (
            <li key={item.id}>○ {item.label}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PublicLinkControl({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const absolute =
    typeof window !== "undefined"
      ? new URL(path, window.location.origin).toString()
      : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      appToast.success({ title: "Card link copied", id: "card-public-copy" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      appToast.error({
        title: "Could not copy link",
        id: "card-public-copy-error",
      });
    }
  }

  return (
    <section className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Public profile</h3>
        <Link
          href={path}
          className="text-xs font-semibold text-accent hover:text-accent-hover"
        >
          Open public profile
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-line bg-page px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs text-support">{absolute}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 text-xs font-semibold text-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

function ShareActions({ path }: { path: string }) {
  async function copyLink() {
    try {
      const url = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      appToast.success({
        title: "Card link copied",
        id: "card-editor-copy",
      });
    } catch {
      appToast.error({
        title: "Could not copy link",
        id: "card-editor-copy-error",
      });
    }
  }

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Naano creator card", url });
        appToast.success({
          title: "Share sheet opened",
          id: "card-editor-share",
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      appToast.info({
        title: "Sharing unavailable",
        description: "Link copied instead.",
        id: "card-editor-share-fallback",
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      appToast.error({
        title: "Could not share card",
        id: "card-editor-share-error",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page"
      >
        Copy link
      </button>
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page"
      >
        Share
      </button>
    </>
  );
}
