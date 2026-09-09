import { CreatorCardActions } from "@/components/creator/overview";
import {
  EmptyState,
  PageHeader,
  formatCount,
  formatPriceCents,
  initials,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorCardPage() {
  const { profile, userId } = await requireRole("creator");
  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!creator) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="My card"
          title="Creator card"
          description="Your public marketplace profile for brands."
        />
        <EmptyState
          title="Creator profile missing"
          description="We could not find a creator profile for this account. Complete onboarding again or contact support."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My card"
        title="Creator card"
        description="Share this profile with brands. Pricing and audience come from your saved creator profile."
      />

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent">
            {initials(profile.full_name) || "C"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-ink">{profile.full_name}</h2>
            <p className="mt-1 text-sm text-support">{creator.headline}</p>
          </div>
          <p className="shrink-0 text-right text-lg font-semibold text-ink">
            {formatPriceCents(creator.price_cents, creator.currency)}
            <span className="block text-xs font-normal text-ink-subtle">
              per post
            </span>
          </p>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-subtle">Expertise</dt>
            <dd className="mt-1 text-ink">
              {creator.topics.length ? creator.topics.join(", ") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Audience size</dt>
            <dd className="mt-1 text-ink">
              {formatCount(creator.audience_size)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Audience summary</dt>
            <dd className="mt-1 text-ink">
              {creator.audience_summary || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">LinkedIn</dt>
            <dd className="mt-1 text-ink">
              {creator.linkedin_url ? (
                <a
                  href={creator.linkedin_url}
                  className="font-medium text-accent hover:text-accent-hover"
                  target="_blank"
                  rel="noreferrer"
                >
                  View profile
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-subtle">Bio</dt>
            <dd className="mt-1 text-ink">{creator.bio || "—"}</dd>
          </div>
        </dl>

        {!creator.linkedin_url ? (
          <p className="mt-6 rounded-lg border border-dashed border-line-strong bg-[#f7f8fa] px-3 py-2 text-sm text-support">
            LinkedIn URL is empty. Brands may trust your card more once it is
            added.
          </p>
        ) : null}

        <div className="mt-6 border-t border-line pt-5">
          <CreatorCardActions cardPath="/creator/card" />
        </div>
      </section>
    </div>
  );
}
