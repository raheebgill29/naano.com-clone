import { EmptyState } from "@/components/workspace/ui";
import { MessagingWorkspace } from "@/components/messages/workspace";
import {
  getConversation,
  listMessageInbox,
} from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/server";
import type { CampaignCreatorStatus, UserRole } from "@/lib/supabase/database.types";

export async function MessagesInboxPage({ role }: { role: UserRole }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { items, error } = await listMessageInbox(role);

  return (
    <MessagingWorkspace
      role={role}
      currentUserId={user?.id ?? ""}
      inboxItems={items}
      inboxError={error}
    />
  );
}

export async function MessagesConversationPage({
  role,
  id,
}: {
  role: UserRole;
  id: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ items, error: inboxError }, conversation] = await Promise.all([
    listMessageInbox(role),
    getConversation(role, id),
  ]);

  if (conversation.error) {
    return (
      <EmptyState
        title="Could not load conversation"
        description={conversation.error}
      />
    );
  }
  if (!conversation.collab || !user) {
    return (
      <EmptyState
        title="Conversation not found"
        description="This collaboration is unavailable or you are not a participant."
      />
    );
  }

  return (
    <MessagingWorkspace
      role={role}
      currentUserId={user.id}
      inboxItems={items}
      inboxError={inboxError}
      activeId={id}
      conversation={{
        otherPartyName: conversation.otherPartyName ?? "Participant",
        campaignName: conversation.campaignName ?? "Campaign",
        status: conversation.collab.status as CampaignCreatorStatus,
        thread: conversation.thread,
      }}
    />
  );
}
