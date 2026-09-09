import type { UserRole } from "@/lib/supabase/database.types";

export type NavItem = {
  label: string;
  href?: string;
  soon?: boolean;
};

export const creatorNav: NavItem[] = [
  { label: "Overview", href: "/creator/dashboard" },
  { label: "My card", href: "/creator/card" },
  { label: "Opportunities", href: "/creator/opportunities" },
  { label: "Collaborations", href: "/creator/collaborations" },
  { label: "Analytics", soon: true },
  { label: "Community", soon: true },
  { label: "Earnings", soon: true },
  { label: "Affiliate program", soon: true },
  { label: "Messages", href: "/creator/messages" },
];

export const brandNav: NavItem[] = [
  { label: "Overview", href: "/brand/dashboard" },
  { label: "Marketplace", href: "/brand/discover" },
  { label: "Shortlist", href: "/brand/shortlist" },
  { label: "Campaigns", href: "/brand/campaigns" },
  { label: "Collaborations", href: "/brand/collaborations" },
  { label: "Analytics", soon: true },
  { label: "Messages", href: "/brand/messages" },
];

export function navForRole(role: UserRole): NavItem[] {
  return role === "brand" ? brandNav : creatorNav;
}

export function homeForRole(role: UserRole) {
  return role === "brand" ? "/brand/dashboard" : "/creator/dashboard";
}
