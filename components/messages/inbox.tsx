"use client";

import Link from "next/link";

import { STATUS_LABEL } from "@/lib/collaborations/status";
import type { InboxItem } from "@/lib/messages/queries";
import { useMessagesInboxRealtime } from "@/lib/messages/use-messages-inbox-realtime";
import type { UserRole } from "@/lib/supabase/database.types";
import { EmptyState, PageHeader } from "@/components/workspace/ui";

export function MessagesInbox({
  role,
  items: initialItems,
  error,
  currentUserId,
}: {
  role: UserRole;
  items: InboxItem[];
  error: string | null;
  currentUserId: string;
}) {
  const base = role === "brand" ? "/brand/messages" : "/creator/messages";
  const accessibleIds = initialItems.map((item) => item.id);
  const items = useMessagesInboxRealtime({
    initialItems,
    currentUserId,
    accessibleIds,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Messages"
        description="Coordinate with your collaboration partners. Conversations stay tied to active work."
      />

      {error ? (
        <EmptyState title="Could not load inbox" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Accepted collaborations appear here so you can exchange plain-text updates."
          action={
            <Link
              href={
                role === "brand"
                  ? "/brand/collaborations"
                  : "/creator/collaborations"
              }
              className="text-sm font-semibold text-accent"
            >
              Open collaborations
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${base}/${item.id}`}
                className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-[#f7f8fa] sm:px-5"
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.unread ? "bg-accent" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {item.otherPartyName}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {item.lastAt
                        ? new Date(item.lastAt).toLocaleString()
                        : "No messages"}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-support">
                    {item.campaignName} · {STATUS_LABEL[item.status]}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                    {item.lastPreview ?? "Start the conversation"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
