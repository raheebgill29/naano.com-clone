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
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col sm:-mx-6 sm:-my-7 lg:-mx-8">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-[14px] border border-line bg-surface shadow-[var(--shadow-sm)]">
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
        M
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">
        Select a conversation
      </h2>
      <p className="mt-1 max-w-sm text-sm text-support">
        Choose a collaboration thread from the list to review messages and
        coordinate next steps.
      </p>
    </div>
  );
}
