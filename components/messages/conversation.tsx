"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useCollaborationMessages } from "@/lib/messages/use-collaboration-messages";
import type { ThreadItem } from "@/lib/messages/queries";

export function ConversationThread({
  items,
  campaignCreatorId,
  currentUserId,
}: {
  items: ThreadItem[];
  campaignCreatorId: string;
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const {
    thread,
    disconnected,
    connectionStatus,
    sending,
    sendMessage,
    retryMessage,
  } = useCollaborationMessages({
    collaborationId: campaignCreatorId,
    currentUserId,
    initialThread: items,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);

  return (
    <div className="flex min-h-[24rem] flex-col rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
      {disconnected ? (
        <p className="border-b border-line bg-[#f7f8fa] px-4 py-2 text-xs text-support">
          {connectionStatus === "connecting"
            ? "Connecting live updates…"
            : connectionStatus === "error"
              ? "Live connection interrupted — reconnecting and refreshing…"
              : "Reconnecting… latest messages will refresh automatically."}
        </p>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {thread.length === 0 ? (
          <p className="py-10 text-center text-sm text-support">
            No messages yet. Say hello to start coordinating.
          </p>
        ) : (
          thread.map((item) =>
            item.kind === "event" ? (
              <div key={`e-${item.id}`} className="flex justify-center">
                <div className="max-w-[90%] rounded-lg border border-dashed border-line-strong bg-[#f7f8fa] px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-support">
                    {item.eventType.replace(/_/g, " ")}
                  </p>
                  {item.message ? (
                    <p className="mt-1 text-xs text-ink-muted">{item.message}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-ink-subtle">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={`m-${item.clientMessageId ?? item.id}`}
                className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    item.status === "failed"
                      ? "border border-red-200 bg-danger-soft text-danger"
                      : item.mine
                        ? "bg-accent text-white"
                        : "border border-line bg-[#f7f8fa] text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-5">
                    {item.body}
                  </p>
                  <p
                    className={`mt-1 text-[10px] ${
                      item.status === "failed"
                        ? "text-danger"
                        : item.mine
                          ? "text-white/80"
                          : "text-ink-subtle"
                    }`}
                  >
                    {item.mine ? "You" : "Them"} ·{" "}
                    {item.status === "sending"
                      ? "Sending…"
                      : item.status === "failed"
                        ? "Failed"
                        : new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.status === "failed" && item.clientMessageId ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold underline"
                      disabled={sending}
                      onClick={() => {
                        void retryMessage(item.clientMessageId!, item.body);
                      }}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer sending={sending} onSend={sendMessage} />
    </div>
  );
}

function MessageComposer({
  sending,
  onSend,
}: {
  sending: boolean;
  onSend: (body: string) => Promise<{ error: string | null }>;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const clean = body.trim();
    if (!clean) {
      setError("Message cannot be blank.");
      return;
    }
    setError(null);
    const result = await onSend(clean);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-line p-3 sm:p-4">
      <label className="sr-only" htmlFor="message-body">
        Message
      </label>
      <textarea
        id="message-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        maxLength={2000}
        disabled={sending}
        placeholder="Write a plain-text message…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none ring-accent focus:ring-2 disabled:opacity-60"
      />
      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error} — edit and retry.
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-subtle">
          Max 2000 characters. Live updates stay in sync.
        </p>
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {sending ? "Sending…" : error ? "Retry send" : "Send"}
        </button>
      </div>
    </form>
  );
}
