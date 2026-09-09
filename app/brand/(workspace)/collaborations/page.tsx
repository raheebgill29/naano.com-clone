import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";

export default async function BrandCollaborationsPage() {
  await requireRole("brand");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborations"
        title="Collaborations"
        description="Review drafts, approvals, published URLs, and payout status per booking."
      />
      <EmptyState
        title="No collaborations yet"
        description="Booked creators will appear here once campaigns include collaboration rows."
      />
    </div>
  );
}
