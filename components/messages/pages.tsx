import Link from "next/link";

import { ConversationThread } from "@/components/messages/conversation";
import { MessagesInbox } from "@/components/messages/inbox";
import { EmptyState, PageHeader } from "@/components/workspace/ui";
import {
  getConversation,
  listMessageInbox,
} from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";

export async function MessagesInboxPage({ role }: { role: UserRole }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { items, error } = await listMessageInbox(role);

  return (
    <MessagesInbox
      role={role}
      items={items}
      error={error}
      currentUserId={user?.id ?? ""}
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
  const base = role === "brand" ? "/brand/messages" : "/creator/messages";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    collab,
    campaignName,
    otherPartyName,
    statusLabel,
    thread,
    error,
  } = await getConversation(role, id);

  if (error) {
    return <EmptyState title="Could not load conversation" description={error} />;
  }
  if (!collab || !user) {
    return (
      <EmptyState
        title="Conversation not found"
        description="This collaboration is unavailable or you are not a participant."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Conversation"
        title={otherPartyName ?? "Participant"}
        description={`${campaignName} · ${statusLabel}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href={base}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              ← Inbox
            </Link>
            <Link
              href={`/${role}/collaborations/${id}`}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Open collaboration
            </Link>
          </div>
        }
      />
      <ConversationThread
        key={id}
        items={thread}
        campaignCreatorId={id}
        currentUserId={user.id}
      />
    </div>
  );
}
