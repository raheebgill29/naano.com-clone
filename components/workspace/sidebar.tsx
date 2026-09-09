"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/components/workspace/nav";

export function WorkspaceSidebar({
  homeHref,
  items,
  onNavigate,
}: {
  homeHref: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Naano
        </Link>
      </div>

      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            if (item.soon || !item.href) {
              return (
                <li key={item.label}>
                  <span className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-ink-subtle">
                    <span>{item.label}</span>
                    <span className="rounded-md bg-page px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-support">
                      Soon
                    </span>
                  </span>
                </li>
              );
            }

            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-page hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
