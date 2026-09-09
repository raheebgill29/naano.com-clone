import type { UserRole } from "@/lib/supabase/database.types";

export type NavIcon =
  | "overview"
  | "card"
  | "marketplace"
  | "shortlist"
  | "campaigns"
  | "opportunities"
  | "collaborations"
  | "messages";

export type NavBadgeKey = "messages" | "opportunities";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  badgeKey?: NavBadgeKey;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const creatorNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Workspace",
    items: [
      { label: "Overview", href: "/creator/dashboard", icon: "overview" },
      { label: "My card", href: "/creator/card", icon: "card" },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      {
        label: "Opportunities",
        href: "/creator/opportunities",
        icon: "opportunities",
        badgeKey: "opportunities",
      },
      {
        label: "Collaborations",
        href: "/creator/collaborations",
        icon: "collaborations",
      },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    items: [
      {
        label: "Messages",
        href: "/creator/messages",
        icon: "messages",
        badgeKey: "messages",
      },
    ],
  },
];

export const brandNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Workspace",
    items: [
      { label: "Overview", href: "/brand/dashboard", icon: "overview" },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    items: [
      { label: "Marketplace", href: "/brand/discover", icon: "marketplace" },
      { label: "Shortlist", href: "/brand/shortlist", icon: "shortlist" },
    ],
  },
  {
    id: "campaigns",
    label: "Campaigns",
    items: [
      { label: "Campaigns", href: "/brand/campaigns", icon: "campaigns" },
      {
        label: "Collaborations",
        href: "/brand/collaborations",
        icon: "collaborations",
      },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    items: [
      {
        label: "Messages",
        href: "/brand/messages",
        icon: "messages",
        badgeKey: "messages",
      },
    ],
  },
];

export function navGroupsForRole(role: UserRole): NavGroup[] {
  return role === "brand" ? brandNavGroups : creatorNavGroups;
}

/** Flat list for compatibility helpers */
export function navForRole(role: UserRole): NavItem[] {
  return navGroupsForRole(role).flatMap((group) => group.items);
}

export function homeForRole(role: UserRole) {
  return role === "brand" ? "/brand/dashboard" : "/creator/dashboard";
}

export function workspaceLabelForRole(role: UserRole) {
  return role === "brand" ? "Brand workspace" : "Creator workspace";
}
