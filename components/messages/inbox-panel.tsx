"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  formatMessageTime,
  ParticipantAvatar,
} from "@/components/messages/ui";
import type { InboxItem } from "@/lib/messages/queries";
import { useMessagesInboxRealtime } from "@/lib/messages/use-messages-inbox-realtime";
import type { UserRole } from "@/lib/supabase/database.types";

export function InboxPanel({
  role,
  items: initialItems,
  error,
  currentUserId,
  activeId,
}: {
  role: UserRole;
  items: InboxItem[];
  error: string | null;
  currentUserId: string;
  activeId?: string | null;
}) {
  const base = role === "brand" ? "/brand/messages" : "/creator/messages";
  const accessibleIds = initialItems.map((item) => item.id);
  const items = useMessagesInboxRealtime({
    initialItems,
    currentUserId,
    accessibleIds,
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = items.filter((item) => item.unread).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "unread" && !item.unread) return false;
      if (!q) return true;
      return (
        item.otherPartyName.toLowerCase().includes(q) ||
        item.campaignName.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 border-b border-line px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight text-ink">
            Messages
          </h1>
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>

        <label className="mt-2.5 block">
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or campaigns"
            className="h-9 w-full rounded-[10px] border border-line bg-page px-3 text-sm text-ink placeholder:text-ink-subtle outline-none transition focus:border-accent focus:bg-surface"
          />
        </label>

        <div className="mt-2.5 flex gap-1 rounded-[10px] bg-page p-1" role="tablist" aria-label="Conversation filters">
          {([
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 rounded-[8px] px-2 py-1.5 text-xs font-semibold transition ${
                filter === tab.key
                  ? "bg-surface text-ink border border-line"
                  : "text-support hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-ink">Could not load inbox</p>
            <p className="mt-1 text-sm text-support">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-ink">No conversations yet</p>
            <p className="mt-1 text-sm text-support">
              Accepted collaborations appear here for coordination.
            </p>
            <Link
              href={
                role === "brand"
                  ? "/brand/collaborations"
                  : "/creator/collaborations"
              }
              className="mt-4 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Open collaborations
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-ink">No matches</p>
            <p className="mt-1 text-sm text-support">
              Try a different search or switch filters.
            </p>
          </div>
        ) : (
          <ul className="py-1" aria-label="Conversations">
            {filtered.map((item) => {
              const selected = activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={`${base}/${item.id}`}
                    className={`flex gap-3 px-3 py-3 transition focus-visible:relative focus-visible:z-10 ${
                      selected
                        ? "bg-accent-soft"
                        : "hover:bg-[#f7f8fa]"
                    }`}
                    aria-current={selected ? "page" : undefined}
                  >
                    <div className="relative shrink-0 pt-0.5">
                      <ParticipantAvatar name={item.otherPartyName} />
                      {item.unread ? (
                        <span
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            item.unread
                              ? "font-semibold text-ink"
                              : "font-medium text-ink"
                          }`}
                        >
                          {item.otherPartyName}
                        </p>
                        <time
                          className="shrink-0 text-[11px] text-ink-subtle"
                          dateTime={item.lastAt ?? undefined}
                        >
                          {item.lastAt ? formatMessageTime(item.lastAt) : ""}
                        </time>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-support">
                        {item.campaignName}
                      </p>
                      <p
                        className={`mt-1 truncate text-xs ${
                          item.unread
                            ? "font-medium text-ink-muted"
                            : "text-ink-subtle"
                        }`}
                      >
                        {item.lastPreview ?? "Start the conversation"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
