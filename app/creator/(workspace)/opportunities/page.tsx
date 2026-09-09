import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";

export default async function CreatorOpportunitiesPage() {
  await requireRole("creator");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Opportunities"
        description="Incoming booking requests and active briefs from brands."
      />
      <EmptyState
        title="No opportunities yet"
        description="When a brand books you on a campaign, the request will show up here with the brief and next actions."
      />
    </div>
  );
}
