"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { WorkspaceTopbar } from "@/components/workspace/topbar";
import type { NavBadgeKey, NavGroup } from "@/components/workspace/nav";
import type { Notification } from "@/lib/supabase/database.types";

export function WorkspaceShell({
  roleLabel,
  workspaceLabel,
  fullName,
  homeHref,
  groups,
  badges = {},
  notifications = [],
  unreadNotifications = 0,
  recipientProfileId,
  children,
  wide = false,
}: {
  roleLabel: string;
  workspaceLabel: string;
  fullName: string;
  homeHref: string;
  groups: NavGroup[];
  badges?: Partial<Record<NavBadgeKey, number>>;
  notifications?: Notification[];
  unreadNotifications?: number;
  recipientProfileId: string;
  children: ReactNode;
  /** Wider content column for marketplace / messaging */
  wide?: boolean;
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
    <div className="min-h-full bg-page text-ink">
      <div className="mx-auto flex min-h-full w-full">
        <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-width)] shrink-0 border-r border-line bg-sidebar lg:block">
          <WorkspaceSidebar
            homeHref={homeHref}
            workspaceLabel={workspaceLabel}
            groups={groups}
            badges={badges}
            fullName={fullName}
            roleLabel={roleLabel}
          />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/35"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              className="absolute inset-y-0 left-0 w-[min(18.5rem,90vw)] border-r border-line bg-sidebar shadow-[var(--shadow)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <p id={titleId} className="sr-only">
                Workspace navigation
              </p>
              <WorkspaceSidebar
                homeHref={homeHref}
                workspaceLabel={workspaceLabel}
                groups={groups}
                badges={badges}
                fullName={fullName}
                roleLabel={roleLabel}
                onNavigate={() => setDrawerOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceTopbar
            workspaceLabel={workspaceLabel}
            onOpenMenu={() => setDrawerOpen(true)}
            notifications={notifications}
            unreadNotifications={unreadNotifications}
            recipientProfileId={recipientProfileId}
          />
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div
              className={`mx-auto w-full ${wide ? "max-w-[80rem]" : "max-w-6xl"}`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
