import { notFound } from "next/navigation";

import { CollaborationDetailWorkspace } from "@/components/collaborations/collaboration-detail-workspace";
import { EmptyState } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { loadCollaborationDetailWorkspace } from "@/lib/collaborations/detail-queries";
import { CollaborationLiveRefresh } from "@/lib/collaborations/use-collaboration-live";

export default async function CreatorCollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("creator");
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const {
    collab,
    campaign,
    brand,
    creator,
    drafts,
    events,
    error,
    messagePreview,
    actorNames,
  } = await loadCollaborationDetailWorkspace(id, "creator");

  if (error) {
    return (
      <EmptyState title="Could not load collaboration" description={error} />
    );
  }
  if (!collab || !campaign) notFound();

  return (
    <>
      <CollaborationLiveRefresh
        collaborationId={collab.id}
        campaignId={campaign.id}
      />
      <CollaborationDetailWorkspace
        role="creator"
        collab={collab}
        campaign={campaign}
        brand={brand}
        creator={creator}
        drafts={drafts}
        events={events}
        actorNames={actorNames}
        messagePreview={messagePreview}
      />
    </>
  );
}
