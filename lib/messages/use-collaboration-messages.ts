"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ThreadItem } from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/client";
import type { CollaborationMessage } from "@/lib/supabase/database.types";

export type ConnectionStatus =
  | "connecting"
  | "subscribed"
  | "reconnecting"
  | "error";

type LiveMessage = Extract<ThreadItem, { kind: "message" }>;

function toLiveMessage(
  row: CollaborationMessage,
  currentUserId: string,
): LiveMessage {
  return {
    kind: "message",
    id: row.id,
    body: row.body,
    senderProfileId: row.sender_profile_id,
    createdAt: row.created_at,
    mine: row.sender_profile_id === currentUserId,
    clientMessageId: row.client_message_id,
    status: "sent",
    error: null,
  };
}

function sortThread(items: ThreadItem[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function upsertMessage(items: ThreadItem[], incoming: LiveMessage): ThreadItem[] {
  const byDbId = items.findIndex(
    (item) => item.kind === "message" && item.id === incoming.id,
  );
  if (byDbId >= 0) {
    const next = [...items];
    next[byDbId] = { ...incoming, status: "sent", error: null };
    return sortThread(next);
  }

  if (incoming.clientMessageId) {
    const byClient = items.findIndex(
      (item) =>
        item.kind === "message" &&
        item.clientMessageId === incoming.clientMessageId,
    );
    if (byClient >= 0) {
      const next = [...items];
      next[byClient] = { ...incoming, status: "sent", error: null };
      return sortThread(next);
    }
  }

  return sortThread([...items, incoming]);
}

export function useCollaborationMessages({
  collaborationId,
  currentUserId,
  initialThread,
}: {
  collaborationId: string;
  currentUserId: string;
  initialThread: ThreadItem[];
}) {
  const [thread, setThread] = useState<ThreadItem[]>(() =>
    sortThread(initialThread),
  );
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [sending, setSending] = useState(false);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const refetchMessages = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data, error } = await supabase
      .from("collaboration_messages")
      .select("*")
      .eq("campaign_creator_id", collaborationId)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    setThread((prev) => {
      const events = prev.filter((item) => item.kind === "event");
      const failedOptimistic = prev.filter(
        (item) =>
          item.kind === "message" &&
          (item.status === "failed" || item.status === "sending"),
      ) as LiveMessage[];

      let next: ThreadItem[] = [
        ...events,
        ...data.map((row) =>
          toLiveMessage(row as CollaborationMessage, currentUserId),
        ),
      ];

      for (const pending of failedOptimistic) {
        const already = next.some(
          (item) =>
            item.kind === "message" &&
            (item.id === pending.id ||
              (pending.clientMessageId &&
                item.clientMessageId === pending.clientMessageId)),
        );
        if (!already) next = [...next, pending];
      }

      return sortThread(next);
    });
  }, [collaborationId, currentUserId]);

  const refetchRef = useRef(refetchMessages);
  useEffect(() => {
    refetchRef.current = refetchMessages;
  }, [refetchMessages]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`collaboration:${collaborationId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaboration_messages",
          filter: `campaign_creator_id=eq.${collaborationId}`,
        },
        (payload) => {
          const row = payload.new as CollaborationMessage;
          setThread((prev) =>
            upsertMessage(prev, toLiveMessage(row, currentUserId)),
          );
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setConnectionStatus("subscribed");
          void refetchRef.current();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("error");
          void refetchRef.current();
        } else if (status === "CLOSED") {
          setConnectionStatus("reconnecting");
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [collaborationId, currentUserId]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      setConnectionStatus((prev) =>
        prev === "subscribed" ? prev : "reconnecting",
      );
      void refetchRef.current();
    }

    function onOnline() {
      setConnectionStatus("reconnecting");
      void refetchRef.current().then(() => setConnectionStatus("subscribed"));
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const sendMessage = useCallback(
    async (body: string, retryClientMessageId?: string) => {
      const clean = body.trim();
      if (sending) return { error: "Message is already sending." };
      if (!clean) return { error: "Message cannot be blank." };
      if (clean.length > 2000) {
        return { error: "Message is too long (max 2000 characters)." };
      }

      const clientMessageId = retryClientMessageId ?? crypto.randomUUID();
      const optimisticId = `temp:${clientMessageId}`;

      setSending(true);
      setThread((prev) => {
        const withoutFailed = prev.filter(
          (item) =>
            !(
              item.kind === "message" &&
              item.clientMessageId === clientMessageId
            ),
        );
        return sortThread([
          ...withoutFailed,
          {
            kind: "message",
            id: optimisticId,
            body: clean,
            senderProfileId: currentUserId,
            createdAt: new Date().toISOString(),
            mine: true,
            clientMessageId,
            status: "sending",
            error: null,
          },
        ]);
      });

      const supabase = supabaseRef.current;
      const { data, error } = await supabase.rpc("collab_send_message", {
        p_campaign_creator_id: collaborationId,
        p_body: clean,
        p_client_message_id: clientMessageId,
      });

      setSending(false);

      if (error || !data) {
        setThread((prev) =>
          prev.map((item) =>
            item.kind === "message" && item.clientMessageId === clientMessageId
              ? {
                  ...item,
                  status: "failed",
                  error: error?.message ?? "Failed to send message.",
                }
              : item,
          ),
        );
        return { error: error?.message ?? "Failed to send message." };
      }

      setThread((prev) =>
        upsertMessage(
          prev,
          toLiveMessage(data as CollaborationMessage, currentUserId),
        ),
      );
      return { error: null as string | null };
    },
    [collaborationId, currentUserId, sending],
  );

  const retryMessage = useCallback(
    async (clientMessageId: string, body: string) => {
      return sendMessage(body, clientMessageId);
    },
    [sendMessage],
  );

  const disconnected =
    connectionStatus === "reconnecting" ||
    connectionStatus === "error" ||
    connectionStatus === "connecting";

  return useMemo(
    () => ({
      thread,
      connectionStatus,
      disconnected,
      sending,
      sendMessage,
      retryMessage,
      refetchMessages,
    }),
    [
      thread,
      connectionStatus,
      disconnected,
      sending,
      sendMessage,
      retryMessage,
      refetchMessages,
    ],
  );
}
