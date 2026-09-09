import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatorPublicCard } from "@/components/marketplace/creator-card";
import { SaveCreatorButton } from "@/components/marketplace/save-button";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
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

  const savedIds = brand
    ? (await getSavedCreatorIds(brand.id)).ids
    : new Set<string>();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Creator details"
        title={creator.full_name}
        description={creator.headline}
        actions={
          <Link
            href="/brand/discover"
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Back to marketplace
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <CreatorPublicCard creator={creator} />
        <aside className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <h2 className="text-base font-semibold text-ink">Actions</h2>
          <SaveCreatorButton
            creatorId={creator.id}
            initiallySaved={savedIds.has(creator.id)}
          />
          {creator.linkedin_url ? (
            <a
              href={creator.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
            >
              View LinkedIn profile
            </a>
          ) : (
            <p className="text-sm text-support">No LinkedIn URL provided.</p>
          )}
          {creator.bio ? (
            <div>
              <h3 className="text-sm font-semibold text-ink">Bio</h3>
              <p className="mt-1 text-sm leading-6 text-support">{creator.bio}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
