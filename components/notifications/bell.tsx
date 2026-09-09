"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import type { Notification } from "@/lib/supabase/database.types";

export function NotificationsBell({
  initialItems,
  initialUnread,
}: {
  initialItems: Notification[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticReadIds, setOptimisticReadIds] = useState<string[]>([]);
  const [allReadOptimistic, setAllReadOptimistic] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const items = initialItems.map((item) =>
    allReadOptimistic || optimisticReadIds.includes(item.id)
      ? { ...item, read_at: item.read_at ?? new Date(0).toISOString() }
      : item,
  );
  const unread = allReadOptimistic
    ? 0
    : Math.max(
        0,
        initialUnread -
          initialItems.filter(
            (n) => !n.read_at && optimisticReadIds.includes(n.id),
          ).length,
      );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-support"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="block h-4 w-4 rounded-full border-2 border-current"
          aria-hidden
        />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow)]"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                disabled={pending}
                className="text-xs font-semibold text-accent hover:text-accent-hover disabled:opacity-60"
                onClick={() => {
                  setAllReadOptimistic(true);
                  startTransition(async () => {
                    await markAllNotificationsReadAction();
                  });
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-support">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-[#f7f8fa] ${
                      item.read_at ? "opacity-80" : ""
                    }`}
                    onClick={() => {
                      setOpen(false);
                      if (!item.read_at) {
                        setOptimisticReadIds((ids) =>
                          ids.includes(item.id) ? ids : [...ids, item.id],
                        );
                        const fd = new FormData();
                        fd.set("notification_id", item.id);
                        startTransition(() => {
                          void markNotificationReadAction(fd);
                        });
                      }
                    }}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {item.title}
                      </span>
                      {!item.read_at ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      ) : null}
                    </span>
                    {item.body ? (
                      <span className="mt-0.5 line-clamp-2 text-xs text-support">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="mt-1 text-[10px] text-ink-subtle">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
