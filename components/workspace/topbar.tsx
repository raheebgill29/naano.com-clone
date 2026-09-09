"use client";

import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { NotificationsBell } from "@/components/notifications/bell";
import { initials } from "@/components/workspace/ui";
import type { Notification } from "@/lib/supabase/database.types";

export function WorkspaceTopbar({
  fullName,
  roleLabel,
  onOpenMenu,
  notifications,
  unreadNotifications,
  recipientProfileId,
}: {
  fullName: string;
  roleLabel: string;
  onOpenMenu: () => void;
  notifications: Notification[];
  unreadNotifications: number;
  recipientProfileId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMenu}
        >
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </button>
        <p className="hidden text-sm text-support sm:block">{roleLabel}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="hidden items-center gap-2 rounded-lg border border-line bg-[#f7f8fa] px-3 py-1.5 text-sm sm:flex"
          title="Wallet balance"
        >
          <span className="text-support">Wallet</span>
          <span className="font-semibold text-ink">$0.00</span>
        </div>

        <label className="sr-only" htmlFor="workspace-language">
          Language
        </label>
        <select
          id="workspace-language"
          className="h-10 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
          defaultValue="en"
          aria-label="Language"
        >
          <option value="en">EN</option>
        </select>

        <NotificationsBell
          key={`${recipientProfileId}:${unreadNotifications}:${notifications.map((n) => `${n.id}:${n.read_at ?? ""}`).join("|")}`}
          initialItems={notifications}
          initialUnread={unreadNotifications}
          recipientProfileId={recipientProfileId}
        />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface pl-1.5 pr-2.5"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {initials(fullName) || "U"}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-ink md:inline">
              {fullName}
            </span>
          </button>

          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow)]"
            >
              <p className="px-3 py-2 text-xs text-support">{roleLabel}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-[#f7f8fa]"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
