"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { InboxItem } from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/client";
import type { CollaborationMessage } from "@/lib/supabase/database.types";

type LivePatch = {
  lastPreview: string;
  lastAt: string;
  unread: boolean;
};

export function useMessagesInboxRealtime({
  initialItems,
  currentUserId,
  accessibleIds,
}: {
  initialItems: InboxItem[];
  currentUserId: string;
  accessibleIds: string[];
}) {
  const [patches, setPatches] = useState<Record<string, LivePatch>>({});
  const supabaseRef = useRef(createClient());
  const accessibleRef = useRef(new Set(accessibleIds));

  useEffect(() => {
    accessibleRef.current = new Set(accessibleIds);
  }, [accessibleIds]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`inbox:${currentUserId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaboration_messages",
        },
        (payload) => {
          const row = payload.new as CollaborationMessage;
          if (!accessibleRef.current.has(row.campaign_creator_id)) return;

          setPatches((prev) => ({
            ...prev,
            [row.campaign_creator_id]: {
              lastPreview: row.body,
              lastAt: row.created_at,
              unread: row.sender_profile_id !== currentUserId,
            },
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return useMemo(() => {
    return initialItems
      .map((item) => {
        const patch = patches[item.id];
        if (!patch) return item;
        const patchIsNewer =
          !item.lastAt || new Date(patch.lastAt) >= new Date(item.lastAt);
        if (!patchIsNewer) return item;
        return {
          ...item,
          lastPreview: patch.lastPreview,
          lastAt: patch.lastAt,
          unread: patch.unread,
        };
      })
      .sort((a, b) => {
        const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return bt - at;
      });
  }, [initialItems, patches]);
}
