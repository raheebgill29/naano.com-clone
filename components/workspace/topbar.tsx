"use client";

import { NotificationsBell } from "@/components/notifications/bell";
import type { Notification } from "@/lib/supabase/database.types";

export function WorkspaceTopbar({
  workspaceLabel,
  onOpenMenu,
  notifications,
  unreadNotifications,
  recipientProfileId,
}: {
  workspaceLabel: string;
  onOpenMenu: () => void;
  notifications: Notification[];
  unreadNotifications: number;
  recipientProfileId: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-page/90 px-4 backdrop-blur-md sm:px-6 lg:justify-end lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-surface lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMenu}
        >
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="block h-0.5 w-3.5 bg-current" />
            <span className="block h-0.5 w-3.5 bg-current" />
            <span className="block h-0.5 w-3.5 bg-current" />
          </span>
        </button>
        <p className="truncate text-[13px] font-semibold text-ink lg:hidden">
          {workspaceLabel}
        </p>
      </div>

      <NotificationsBell
        key={`${recipientProfileId}:${unreadNotifications}:${notifications.map((n) => `${n.id}:${n.read_at ?? ""}`).join("|")}`}
        initialItems={notifications}
        initialUnread={unreadNotifications}
        recipientProfileId={recipientProfileId}
      />
    </header>
  );
}
