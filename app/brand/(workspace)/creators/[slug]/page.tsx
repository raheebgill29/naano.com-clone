import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import { InviteToCampaignForm } from "@/components/campaigns/InviteToCampaignForm";
import {
  EmptyState,
  Portrait,
  SectionTitle,
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import type { CampaignStatus } from "@/lib/supabase/database.types";
import {
  getPublishedCreatorBySlug,
  getSavedCreatorIds,
} from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BrandCreatorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await requireRole("brand");
  const { slug } = await params;

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    notFound();
  }

  const { creator, error } = await getPublishedCreatorBySlug(slug);

  if (error) {
    return (
      <EmptyState title="Could not load creator" description={error} />
    );
  }

  if (!creator) {
    notFound();
  }

  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  const { data: eligibleCampaigns } = brand
    ? await supabase
        .from("campaigns")
        .select("id,campaign_name,status")
        .eq("brand_id", brand.id)
        .in("status", ["draft", "active"])
    : {
        data: [] as Array<{
          id: string;
          campaign_name: string;
          status: CampaignStatus;
        }>,
      };

  const savedIds = brand
    ? (await getSavedCreatorIds(brand.id)).ids
    : new Set<string>();

  const available = creator.availability === "available";

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-[12px] text-support">
        <Link href="/brand/discover" className="hover:text-ink">
          Marketplace
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-ink">{creator.full_name}</span>
      </nav>

      {/* Talent hero */}
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          <Portrait
            src={creator.avatar_url}
            name={creator.full_name}
            className="aspect-[4/5] w-full max-w-sm"
            rounded="rounded-[12px]"
            textClass="display text-[5rem]"
          />
        </div>
        <div className="min-w-0 lg:col-span-8">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                available ? "bg-success" : "bg-line-strong"
              }`}
            />
            {available ? "Available for campaigns" : "Currently unavailable"}
            {savedIds.has(creator.id) ? (
              <span className="ml-2 text-accent">Shortlisted</span>
            ) : null}
          </p>
          <h1 className="display mt-2 text-[2.5rem] leading-[1] text-ink sm:text-[3.25rem]">
            {creator.full_name}
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-ink-muted">
            {creator.headline}
          </p>

          <dl className="tnum mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium text-ink-subtle">Followers</dt>
              <dd className="display mt-0.5 text-[1.5rem] text-ink">
                {formatCompactCount(creator.audience_size)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-ink-subtle">Per post</dt>
              <dd className="display mt-0.5 text-[1.5rem] text-ink">
                {formatPriceCents(creator.price_cents, creator.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-ink-subtle">Location</dt>
              <dd className="mt-1 text-[14px] font-medium text-ink">
                {creator.location || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-ink-subtle">Languages</dt>
              <dd className="mt-1 text-[14px] font-medium text-ink">
                {creator.languages.length ? creator.languages.join(", ") : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="min-w-[14rem]">
              <InviteToCampaignForm
                creatorId={creator.id}
                campaigns={eligibleCampaigns ?? []}
                creator={{
                  full_name: creator.full_name,
                  headline: creator.headline,
                  price_cents: creator.price_cents,
                  currency: creator.currency,
                }}
              />
            </div>
            <SaveCreatorButton
              creatorId={creator.id}
              initiallySaved={savedIds.has(creator.id)}
            />
            {creator.linkedin_url ? (
              <a
                href={creator.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-[10px] px-3 text-[13px] font-semibold text-ink-muted hover:text-ink"
              >
                LinkedIn ↗
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Body: positioning + audience */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          {creator.bio ? (
            <section>
              <SectionTitle title="About" />
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-muted">
                {creator.bio}
              </p>
            </section>
          ) : null}
          {creator.audience_summary ? (
            <section>
              <SectionTitle title="Audience" />
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-muted">
                {creator.audience_summary}
              </p>
            </section>
          ) : null}
        </div>
        <aside className="lg:col-span-4">
          <SectionTitle title="Specialties" count={creator.topics.length} />
          {creator.topics.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {creator.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-[6px] border border-line px-2.5 py-1 text-[12px] font-medium text-ink-muted"
                >
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-support">No specialties listed.</p>
          )}
          <div className="mt-8">
            <SectionTitle title="Marketplace listing" />
            <div className="mt-3">
              <CreatorPublicCard creator={creator} compact />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
