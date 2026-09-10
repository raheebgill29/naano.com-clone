"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { BrandWordmark } from "@/components/ui/brand-mark";
import { signOutAction } from "@/lib/auth/actions";
import { NavGlyph } from "@/components/workspace/icons";
import type { NavBadgeKey, NavGroup } from "@/components/workspace/nav";
import { initials } from "@/components/workspace/ui";

function Badge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={`ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
        active
          ? "bg-white/15 text-white"
          : "bg-accent-soft text-accent"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function WorkspaceSidebar({
  homeHref,
  workspaceLabel,
  groups,
  badges,
  fullName,
  roleLabel,
  onNavigate,
}: {
  homeHref: string;
  workspaceLabel: string;
  groups: NavGroup[];
  badges: Partial<Record<NavBadgeKey, number>>;
  fullName: string;
  roleLabel: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountId = useId();
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 pb-5 pt-6">
        <BrandWordmark
          href={homeHref}
          subtitle={workspaceLabel}
          markClassName="h-8 w-8"
          className="min-w-0"
          onClick={onNavigate}
        />
      </div>

      <nav
        aria-label="Workspace"
        className="flex-1 space-y-5 overflow-y-auto px-3 pb-5 pt-2"
      >
        {groups.map((group) => (
          <div key={group.id} className="border-t border-line pt-3">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const badge = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-10 items-center gap-2.5 rounded-[9px] px-2.5 text-[13px] font-semibold transition-[background-color,color] duration-150 ${
                        active
                          ? "bg-ink text-white"
                          : "text-ink-muted hover:bg-surface/80 hover:text-ink"
                      }`}
                    >
                      <NavGlyph
                        name={item.icon}
                        className={
                          active
                            ? "text-white/80"
                            : "text-ink-subtle group-hover:text-ink"
                        }
                      />
                      <span className="min-w-0 truncate">{item.label}</span>
                      <Badge count={badge} active={active} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3" ref={accountRef}>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls={accountId}
            onClick={() => setAccountOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-2 py-2 text-left transition-colors duration-150 hover:bg-surface/80"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {initials(fullName) || "U"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">
                {fullName}
              </span>
              <span className="block truncate text-[11px] text-support">
                {roleLabel}
              </span>
            </span>
            <span aria-hidden className="text-ink-subtle text-xs">
              ▾
            </span>
          </button>

          {accountOpen ? (
            <div
              id={accountId}
              role="menu"
              className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 rounded-[12px] border border-line bg-surface p-1 shadow-[var(--shadow)]"
            >
              <p className="px-3 py-2 text-xs text-support">{workspaceLabel}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full rounded-[10px] px-3 py-2 text-left text-sm font-medium text-ink transition-colors duration-150 hover:bg-page"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
