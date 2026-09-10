"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { BrandWordmark } from "@/components/ui/brand-mark";
import { signOutAction } from "@/lib/auth/actions";
import { NavGlyph } from "@/components/workspace/icons";
import type { NavBadgeKey, NavGroup } from "@/components/workspace/nav";
import { initials } from "@/components/workspace/ui";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
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
      <div className="border-b border-line px-4 py-4">
        <BrandWordmark
          href={homeHref}
          subtitle={workspaceLabel}
          markClassName="h-7 w-7"
          className="min-w-0"
          onClick={onNavigate}
        />
      </div>

      <nav
        aria-label="Workspace"
        className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3"
      >
        {groups.map((group) => (
          <div key={group.id}>
            <p className="px-2.5 pb-1 text-[11px] font-medium text-ink-subtle">
              {group.label}
            </p>
            <ul className="space-y-0.5">
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
                      className={`group relative flex min-h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium transition-[background-color,color] duration-150 ${
                        active
                          ? "bg-page text-ink"
                          : "text-ink-muted hover:bg-page/70 hover:text-ink"
                      }`}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                        />
                      ) : null}
                      <NavGlyph
                        name={item.icon}
                        className={
                          active
                            ? "text-accent"
                            : "text-ink-subtle group-hover:text-ink"
                        }
                      />
                      <span className="min-w-0 truncate">{item.label}</span>
                      <Badge count={badge} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2.5" ref={accountRef}>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls={accountId}
            onClick={() => setAccountOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-page"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-page text-[11px] font-semibold text-ink-muted">
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
