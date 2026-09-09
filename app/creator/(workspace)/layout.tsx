import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import { homeForRole, navForRole } from "@/components/workspace/nav";
import { requireRole } from "@/lib/auth/session";

export default async function CreatorWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireRole("creator");

  return (
    <WorkspaceShell
      roleLabel="Creator"
      fullName={profile.full_name}
      homeHref={homeForRole("creator")}
      items={navForRole("creator")}
    >
      {children}
    </WorkspaceShell>
  );
}
