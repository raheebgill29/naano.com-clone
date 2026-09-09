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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-line text-ink transition-colors duration-150 hover:bg-page lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMenu}
        >
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </button>
        <p className="truncate text-sm font-medium text-support">
          {workspaceLabel}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsBell
          key={`${recipientProfileId}:${unreadNotifications}:${notifications.map((n) => `${n.id}:${n.read_at ?? ""}`).join("|")}`}
          initialItems={notifications}
          initialUnread={unreadNotifications}
          recipientProfileId={recipientProfileId}
        />
      </div>
    </header>
  );
}
