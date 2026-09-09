import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";

export default async function CreatorCollaborationsPage() {
  await requireRole("creator");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborations"
        title="Collaborations"
        description="Track accepted work from draft through published posts."
      />
      <EmptyState
        title="No collaborations in progress"
        description="Accepted opportunities will move here so you can submit drafts, revisions, and published URLs."
      />
    </div>
  );
}
