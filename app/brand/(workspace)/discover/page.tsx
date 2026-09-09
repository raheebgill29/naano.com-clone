import { PrimaryLink } from "@/components/ui/primitives";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";

export default async function BrandDiscoverPage() {
  await requireRole("brand");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Discover creators"
        description="Browse priced LinkedIn creators. Full filters and booking arrive in the next build."
      />
      <EmptyState
        title="Marketplace is warming up"
        description="Creator discovery will list discoverable profiles from Supabase here. No seed creators are fabricated in this UI pass."
        action={
          <PrimaryLink href="/brand/campaigns" className="!w-auto">
            Prepare a campaign
          </PrimaryLink>
        }
      />
    </div>
  );
}
