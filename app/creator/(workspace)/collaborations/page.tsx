import { CollaborationsWorkspace } from "@/components/collaborations/collaborations-workspace";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import { requireRole } from "@/lib/auth/session";
import { loadCreatorCollaborationList } from "@/lib/collaborations/list-queries";
import { ACTIVE_COLLAB_STATUSES } from "@/lib/collaborations/status";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorCollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireRole("creator");
  const params = await searchParams;

  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!creator) {
    return (
      <EmptyState
        title="Creator profile missing"
        description="Complete creator onboarding before tracking collaborations."
      />
    );
  }

  const { items, error, loadedAtMs } = await loadCreatorCollaborationList(
    creator.id,
  );
  const activeCount = items.filter((item) =>
    ACTIVE_COLLAB_STATUSES.includes(item.status),
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your collaborations"
        description={
          activeCount > 0
            ? `${activeCount} active · Submit drafts, hit deadlines, and publish.`
            : "Track drafts, deadlines, and publishing for accepted work."
        }
      />

      <CollaborationsWorkspace
        key={[
          Array.isArray(params.q) ? params.q[0] : params.q,
          Array.isArray(params.tab) ? params.tab[0] : params.tab,
          Array.isArray(params.sort) ? params.sort[0] : params.sort,
          Array.isArray(params.campaign) ? params.campaign[0] : params.campaign,
          Array.isArray(params.status) ? params.status[0] : params.status,
          Array.isArray(params.deadline) ? params.deadline[0] : params.deadline,
        ].join("|")}
        items={items}
        error={error}
        searchParams={params}
        loadedAtMs={loadedAtMs}
        role="creator"
      />
    </div>
  );
}
