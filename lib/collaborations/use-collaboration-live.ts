"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to collaboration, draft, and campaign UPDATEs and refreshes RSC data.
 * Does not trust Realtime payloads for status display.
 */
export function useCollaborationLive(
  collaborationId: string,
  campaignId?: string | null,
) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!collaborationId) return;

    const supabase = supabaseRef.current;
    let channel = supabase
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
      );

    if (campaignId) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        () => {
          router.refresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, collaborationId, router]);
}

export function CollaborationLiveRefresh({
  collaborationId,
  campaignId,
}: {
  collaborationId: string;
  campaignId?: string | null;
}) {
  useCollaborationLive(collaborationId, campaignId);
  return null;
}
