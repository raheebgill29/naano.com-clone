"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to collaboration + draft UPDATEs and refreshes canonical RSC data.
 * Does not trust Realtime payloads for status display.
 */
export function useCollaborationLive(collaborationId: string) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!collaborationId) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`collab-live:${collaborationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_creators",
          filter: `id=eq.${collaborationId}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_submissions",
          filter: `campaign_creator_id=eq.${collaborationId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [collaborationId, router]);
}

export function CollaborationLiveRefresh({
  collaborationId,
}: {
  collaborationId: string;
}) {
  useCollaborationLive(collaborationId);
  return null;
}
