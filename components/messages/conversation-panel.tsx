"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  CollaborationStatusBadge,
  dayKey,
  formatDateSeparator,
  formatMessageTime,
  ParticipantAvatar,
} from "@/components/messages/ui";
import { useCollaborationMessages } from "@/lib/messages/use-collaboration-messages";
import type { ThreadItem } from "@/lib/messages/queries";
import { appToast } from "@/lib/toast";
import type { CampaignCreatorStatus, UserRole } from "@/lib/supabase/database.types";

type MessageItem = Extract<ThreadItem, { kind: "message" }>;

export function ConversationPanel({
  role,
  campaignCreatorId,
  currentUserId,
  initialThread,
  otherPartyName,
  campaignName,
  status,
}: {
  role: UserRole;
  campaignCreatorId: string;
  currentUserId: string;
  initialThread: ThreadItem[];
  otherPartyName: string;
  campaignName: string;
  status: CampaignCreatorStatus;
}) {
  const base = role === "brand" ? "/brand/messages" : "/creator/messages";
  const collabHref = `/${role}/collaborations/${campaignCreatorId}`;
  const otherRoleLabel = role === "brand" ? "Creator" : "Brand";

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
    initialThread,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const prevLenRef = useRef(thread.length);
  const didInitialScroll = useRef(false);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    nearBottomRef.current = true;
    setShowNewMessages(false);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < 80;
    if (nearBottomRef.current) setShowNewMessages(false);
  }

  useEffect(() => {
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      scrollToBottom("auto");
      prevLenRef.current = thread.length;
      return;
    }

    if (thread.length <= prevLenRef.current) {
      prevLenRef.current = thread.length;
      return;
    }

    const added = thread.length - prevLenRef.current;
    prevLenRef.current = thread.length;
    const last = thread[thread.length - 1];
    const ownSend =
      last?.kind === "message" &&
      last.mine &&
      (last.status === "sending" || last.status === "sent");

    if (nearBottomRef.current || ownSend) {
      scrollToBottom(
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      );
    } else if (added > 0) {
      setShowNewMessages(true);
    }
  }, [thread]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="sticky top-0 z-10 shrink-0 border-b border-line bg-surface px-3 py-3 sm:px-4">
        <div className="flex items-start gap-3">
          <Link
            href={base}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink md:hidden"
            aria-label="Back to messages"
          >
            <span aria-hidden>←</span>
          </Link>
          <ParticipantAvatar name={otherPartyName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-ink">
                {otherPartyName}
              </h2>
              <CollaborationStatusBadge status={status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-support">
              {otherRoleLabel} · {campaignName}
            </p>
          </div>
          <Link
            href={collabHref}
            className="hidden shrink-0 rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-ink hover:bg-[#f7f8fa] sm:inline-flex"
          >
            View collaboration
          </Link>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
          <Link
            href={collabHref}
            className="text-xs font-semibold text-accent hover:text-accent-hover"
          >
            View collaboration
          </Link>
          {disconnected ? (
            <p className="text-[11px] text-support">
              {connectionStatus === "connecting"
                ? "Connecting…"
                : "Reconnecting…"}
            </p>
          ) : null}
        </div>
        {disconnected ? (
          <p className="mt-2 hidden text-[11px] text-support sm:block">
            {connectionStatus === "connecting"
              ? "Connecting live updates…"
              : connectionStatus === "error"
                ? "Connection interrupted — refreshing…"
                : "Reconnecting…"}
          </p>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5"
        >
          {thread.length === 0 ? (
            <div className="flex h-full min-h-48 items-center justify-center px-4 text-center">
              <div>
                <p className="text-sm font-semibold text-ink">No messages yet</p>
                <p className="mt-1 text-sm text-support">
                  Send a note to start coordinating this collaboration.
                </p>
              </div>
            </div>
          ) : (
            <Timeline
              thread={thread}
              sending={sending}
              onRetry={retryMessage}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {showNewMessages ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-accent shadow-[var(--shadow)] hover:bg-accent-soft"
              onClick={() => scrollToBottom()}
            >
              New messages
            </button>
          </div>
        ) : null}
      </div>

      <MessageComposer
        sending={sending}
        connectionStatus={connectionStatus}
        disconnected={disconnected}
        onSend={sendMessage}
      />
    </div>
  );
}

function Timeline({
  thread,
  sending,
  onRetry,
}: {
  thread: ThreadItem[];
  sending: boolean;
  onRetry: (clientMessageId: string, body: string) => Promise<{ error: string | null }>;
}) {
  const rows = useMemo(() => {
    const out: Array<
      | { type: "date"; key: string; label: string }
      | { type: "event"; key: string; item: Extract<ThreadItem, { kind: "event" }> }
      | {
          type: "group";
          key: string;
          mine: boolean;
          messages: MessageItem[];
        }
    > = [];

    let lastDay: string | null = null;
    let group: MessageItem[] | null = null;

    function flushGroup() {
      if (!group || group.length === 0) return;
      out.push({
        type: "group",
        key: `g-${group[0].clientMessageId ?? group[0].id}`,
        mine: group[0].mine,
        messages: group,
      });
      group = null;
    }

    for (const item of thread) {
      const key = dayKey(item.createdAt);
      if (key !== lastDay) {
        flushGroup();
        out.push({
          type: "date",
          key: `d-${key}`,
          label: formatDateSeparator(item.createdAt),
        });
        lastDay = key;
      }

      if (item.kind === "event") {
        flushGroup();
        out.push({ type: "event", key: `e-${item.id}`, item });
        continue;
      }

      if (
        group &&
        group[0].mine === item.mine &&
        group[0].senderProfileId === item.senderProfileId
      ) {
        group.push(item);
      } else {
        flushGroup();
        group = [item];
      }
    }
    flushGroup();
    return out;
  }, [thread]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {rows.map((row) => {
        if (row.type === "date") {
          return (
            <div key={row.key} className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-medium text-ink-subtle">
                {row.label}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          );
        }

        if (row.type === "event") {
          return (
            <div key={row.key} className="flex justify-center">
              <div className="max-w-[90%] rounded-lg border border-dashed border-line-strong bg-[#f7f8fa] px-3 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-support">
                  {row.item.eventType.replace(/_/g, " ")}
                </p>
                {row.item.message ? (
                  <p className="mt-1 text-xs text-ink-muted">{row.item.message}</p>
                ) : null}
              </div>
            </div>
          );
        }

        return (
          <div
            key={row.key}
            className={`flex flex-col gap-1 ${row.mine ? "items-end" : "items-start"}`}
          >
            {row.messages.map((msg, index) => {
              const showTime =
                index === row.messages.length - 1 ||
                msg.status === "sending" ||
                msg.status === "failed";
              return (
                <div
                  key={msg.clientMessageId ?? msg.id}
                  className={`max-w-[min(100%,28rem)] ${row.mine ? "ml-8" : "mr-8"}`}
                >
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                      msg.status === "failed"
                        ? "border border-red-200 bg-danger-soft text-danger"
                        : row.mine
                          ? "rounded-br-md bg-accent text-white"
                          : "rounded-bl-md border border-line bg-[#f7f8fa] text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  {showTime ? (
                    <p
                      className={`mt-1 px-1 text-[10px] ${
                        msg.status === "failed"
                          ? "text-danger"
                          : "text-ink-subtle"
                      } ${row.mine ? "text-right" : "text-left"}`}
                    >
                      {msg.status === "sending"
                        ? "Sending…"
                        : msg.status === "failed"
                          ? "Failed to send"
                          : formatMessageTime(msg.createdAt)}
                      {msg.status === "failed" && msg.clientMessageId ? (
                        <>
                          {" · "}
                          <button
                            type="button"
                            className="font-semibold underline"
                            disabled={sending}
                            onClick={() => {
                              void onRetry(msg.clientMessageId!, msg.body);
                            }}
                          >
                            Retry
                          </button>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MessageComposer({
  sending,
  disconnected,
  connectionStatus,
  onSend,
}: {
  sending: boolean;
  disconnected: boolean;
  connectionStatus: string;
  onSend: (body: string) => Promise<{ error: string | null }>;
}) {
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(next, 44)}px`;
  }, [body]);

  async function submit() {
    if (sending) return;
    const clean = body.trim();
    if (!clean) {
      setFieldError("Message cannot be blank.");
      return;
    }
    setFieldError(null);
    const result = await onSend(clean);
    if (result.error) {
      appToast.error({
        title: "Message not sent",
        description: result.error,
        id: `message-send:${result.error}`,
      });
      return;
    }
    setBody("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-line bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="message-body">
          Message
        </label>
        <textarea
          id="message-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          disabled={sending}
          placeholder="Write a message…"
          className="max-h-40 min-h-11 w-full resize-none overflow-y-auto rounded-xl border border-line bg-[#f7f8fa] px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle outline-none transition focus:border-accent focus:bg-surface disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label={sending ? "Sending message" : "Send message"}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-ink-subtle">
          Enter to send · Shift+Enter for new line
        </p>
        {disconnected ? (
          <p className="text-[11px] text-support">
            {connectionStatus === "connecting" ? "Connecting…" : "Reconnecting…"}
          </p>
        ) : (
          <p className="text-[11px] text-ink-subtle">{body.length}/2000</p>
        )}
      </div>
      {fieldError ? (
        <p className="mt-2 text-xs text-danger" role="status">
          {fieldError}
        </p>
      ) : null}
    </form>
  );
}
