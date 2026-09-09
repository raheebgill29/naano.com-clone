"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { FormMessage } from "@/components/ui/primitives";
import {
  publishCreatorCard,
  saveCreatorCardDraft,
  unpublishCreatorCard,
  type CreatorCardActionState,
} from "@/lib/creators/actions";
import { getPublishRequirements } from "@/lib/creators/card";
import type { Creator, Profile } from "@/lib/supabase/database.types";

const initialState: CreatorCardActionState = {};

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

  const [fullName, setFullName] = useState(profile.full_name);
  const [headline, setHeadline] = useState(creator?.headline ?? "");
  const [bio, setBio] = useState(creator?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(creator?.linkedin_url ?? "");
  const [location, setLocation] = useState(creator?.location ?? "");
  const [languages, setLanguages] = useState(
    (creator?.languages ?? []).join(", "),
  );
  const [topics, setTopics] = useState((creator?.topics ?? []).join(", "));
  const [audienceSummary, setAudienceSummary] = useState(
    creator?.audience_summary ?? "",
  );
  const [audienceSize, setAudienceSize] = useState(
    creator?.audience_size?.toString() ?? "",
  );
  const [priceCents, setPriceCents] = useState(
    creator?.price_cents?.toString() ?? "",
  );
  const [currency, setCurrency] = useState(creator?.currency ?? "USD");
  const [availability, setAvailability] = useState<"available" | "unavailable">(
    creator?.availability ?? "available",
  );

  const topicList = useMemo(
    () =>
      topics
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    [topics],
  );
  const languageList = useMemo(
    () =>
      languages
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    [languages],
  );

  const gate = getPublishRequirements({
    fullName,
    headline,
    topics: topicList,
    audienceSize: audienceSize === "" ? null : Number(audienceSize),
    priceCents: priceCents === "" ? null : Number(priceCents),
    currency,
  });

  const status = creator?.publication_status ?? "draft";
  const cardPath = creator?.slug
    ? `/brand/creators/${creator.slug}`
    : "/creator/card";
  const feedback = publishState.error || publishState.success
    ? publishState
    : draftState.error || draftState.success
      ? draftState
      : unpublishMessage;

  async function onUnpublish() {
    setUnpublishPending(true);
    const result = await unpublishCreatorCard();
    setUnpublishMessage(result);
    setUnpublishPending(false);
  }

  const sharedFields = (
    <>
      <input type="hidden" name="full_name" value={fullName} />
      <input type="hidden" name="headline" value={headline} />
      <input type="hidden" name="bio" value={bio} />
      <input type="hidden" name="linkedin_url" value={linkedinUrl} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="languages" value={languages} />
      <input type="hidden" name="topics" value={topics} />
      <input type="hidden" name="audience_summary" value={audienceSummary} />
      <input type="hidden" name="audience_size" value={audienceSize} />
      <input type="hidden" name="price_cents" value={priceCents} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="availability" value={availability} />
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Edit card</h2>
            <p className="mt-1 text-sm text-support">
              Status:{" "}
              <span className="font-semibold text-ink">
                {status === "published" ? "Published" : "Draft"}
              </span>
              {creator?.slug ? (
                <>
                  {" "}
                  · slug <code className="text-xs">{creator.slug}</code>
                </>
              ) : null}
            </p>
          </div>
          <ShareActions cardPath={cardPath} disabled={!creator?.slug || status !== "published"} />
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Display name <span className="text-danger">*</span>
            </span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Headline <span className="text-danger">*</span>
            </span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Bio</span>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">LinkedIn URL</span>
              <input
                type="url"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                value={linkedinUrl}
                onChange={(event) => setLinkedinUrl(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Location</span>
              <input
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Berlin, Germany"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Languages (comma-separated)
            </span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="English, German"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Specialties / topics <span className="text-danger">*</span>
            </span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="saas, marketing, ai"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Target audience</span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              value={audienceSummary}
              onChange={(event) => setAudienceSummary(event.target.value)}
              placeholder="B2B SaaS marketers, US/EU"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">
                Followers <span className="text-danger">*</span>
              </span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                value={audienceSize}
                onChange={(event) => setAudienceSize(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">
                Price (cents) <span className="text-danger">*</span>
              </span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                value={priceCents}
                onChange={(event) => setPriceCents(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">
                Currency <span className="text-danger">*</span>
              </span>
              <input
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Availability</legend>
            <label className="mr-4 inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={availability === "available"}
                onChange={() => setAvailability("available")}
              />
              Available
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={availability === "unavailable"}
                onChange={() => setAvailability("unavailable")}
              />
              Unavailable
            </label>
          </fieldset>

          <div className="rounded-lg border border-line bg-[#f7f8fa] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-support">
              Publish checklist
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {gate.requirements.map((item) => (
                <li
                  key={item.id}
                  className={item.met ? "text-success" : "text-ink-muted"}
                >
                  {item.met ? "✓" : "○"} {item.label}
                </li>
              ))}
            </ul>
          </div>

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

          <div className="flex flex-wrap gap-2">
            <form action={draftAction}>
              {sharedFields}
              <button
                type="submit"
                disabled={draftPending || publishPending}
                className="inline-flex rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                {draftPending ? "Saving…" : "Save draft"}
              </button>
            </form>
            <form action={publishAction}>
              {sharedFields}
              <button
                type="submit"
                disabled={draftPending || publishPending || !gate.ready}
                className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {publishPending ? "Publishing…" : "Publish card"}
              </button>
            </form>
            {status === "published" ? (
              <button
                type="button"
                onClick={onUnpublish}
                disabled={unpublishPending}
                className="inline-flex rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                {unpublishPending ? "Updating…" : "Unpublish"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Live preview</h2>
          <p className="mt-1 text-sm text-support">
            This is how brands will see your card in the marketplace.
          </p>
        </div>
        <CreatorPublicCard
          creator={{
            full_name: fullName || "Your name",
            headline: headline || "Your headline",
            topics: topicList,
            audience_size: Number(audienceSize) || 0,
            location: location || null,
            price_cents: Number(priceCents) || 0,
            currency: currency || "USD",
            availability,
            languages: languageList,
            bio: bio || null,
            audience_summary: audienceSummary || null,
          }}
        />
        {status === "published" && creator?.slug ? (
          <p className="text-sm text-support">
            Public brand link:{" "}
            <Link
              href={cardPath}
              className="font-semibold text-accent hover:text-accent-hover"
            >
              {cardPath}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-support">
            Publish your card to make it discoverable and shareable.
          </p>
        )}
      </aside>
    </div>
  );
}

function ShareActions({
  cardPath,
  disabled,
}: {
  cardPath: string;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    setMessage(null);
    setError(null);
    try {
      const url = new URL(cardPath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setMessage("Card link copied.");
    } catch {
      setError("Could not copy link.");
    }
  }

  async function share() {
    setMessage(null);
    setError(null);
    const url = new URL(cardPath, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Naano creator card", url });
        setMessage("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Sharing unavailable — link copied.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Could not share card.");
    }
  }

  return (
    <div className="space-y-1 text-right">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={copyLink}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-50"
        >
          Copy link
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={share}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-50"
        >
          Share
        </button>
      </div>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
