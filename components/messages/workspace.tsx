"use client";

import { InboxPanel } from "@/components/messages/inbox-panel";
import { ConversationPanel } from "@/components/messages/conversation-panel";
import type { InboxItem, ThreadItem } from "@/lib/messages/queries";
import type {
  CampaignCreatorStatus,
  UserRole,
} from "@/lib/supabase/database.types";

export function MessagingWorkspace({
  role,
  currentUserId,
  inboxItems,
  inboxError,
  activeId,
  conversation,
}: {
  role: UserRole;
  currentUserId: string;
  inboxItems: InboxItem[];
  inboxError: string | null;
  activeId?: string | null;
  conversation?: {
    otherPartyName: string;
    campaignName: string;
    status: CampaignCreatorStatus;
    thread: ThreadItem[];
  } | null;
}) {
  const showConversation = Boolean(activeId && conversation);

  return (
    <div className="-mx-4 -my-5 flex h-[calc(100dvh-3rem)] min-h-0 flex-col sm:-mx-6 sm:-my-6 lg:-mx-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-[12px] border border-line bg-surface">
          <aside
            className={`min-h-0 w-full shrink-0 border-r border-line md:w-[340px] ${
              showConversation ? "hidden md:flex md:flex-col" : "flex flex-col"
            }`}
          >
            <InboxPanel
              role={role}
              items={inboxItems}
              error={inboxError}
              currentUserId={currentUserId}
              activeId={activeId}
            />
          </aside>

          <section
            className={`min-h-0 min-w-0 flex-1 ${
              showConversation ? "flex flex-col" : "hidden md:flex md:flex-col"
            }`}
          >
            {showConversation && activeId && conversation ? (
              <ConversationPanel
                key={activeId}
                role={role}
                campaignCreatorId={activeId}
                currentUserId={currentUserId}
                initialThread={conversation.thread}
                otherPartyName={conversation.otherPartyName}
                campaignName={conversation.campaignName}
                status={conversation.status}
              />
            ) : (
              <EmptyConversationPane />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyConversationPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h2 className="text-[15px] font-semibold text-ink">Select a conversation</h2>
      <p className="mt-1 max-w-sm text-sm text-support">
        Open a thread to review messages for an active collaboration.
      </p>
    </div>
  );
}
