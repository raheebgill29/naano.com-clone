import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";

export default async function BrandCampaignsPage() {
  await requireRole("brand");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaigns"
        title="Campaigns"
        description="Create briefs and manage booked creators from one workspace."
      />
      <EmptyState
        title="No campaigns yet"
        description="Campaign creation is next. This page is ready so navigation and authorization stay intact."
      />
    </div>
  );
}
