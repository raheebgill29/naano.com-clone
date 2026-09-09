"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { WorkspaceTopbar } from "@/components/workspace/topbar";
import type { NavItem } from "@/components/workspace/nav";
import type { Notification } from "@/lib/supabase/database.types";

export function WorkspaceShell({
  roleLabel,
  fullName,
  homeHref,
  items,
  notifications = [],
  unreadNotifications = 0,
  recipientProfileId,
  children,
}: {
  roleLabel: string;
  fullName: string;
  homeHref: string;
  items: NavItem[];
  notifications?: Notification[];
  unreadNotifications?: number;
  recipientProfileId: string;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-full bg-[#f7f8fa] text-ink">
      <div className="mx-auto flex min-h-full w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-surface lg:block">
          <WorkspaceSidebar homeHref={homeHref} items={items} />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/30"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] bg-surface shadow-[var(--shadow)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <p id={titleId} className="sr-only">
                Workspace navigation
              </p>
              <WorkspaceSidebar
                homeHref={homeHref}
                items={items}
                onNavigate={() => setDrawerOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceTopbar
            fullName={fullName}
            roleLabel={roleLabel}
            onOpenMenu={() => setDrawerOpen(true)}
            notifications={notifications}
            unreadNotifications={unreadNotifications}
            recipientProfileId={recipientProfileId}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
