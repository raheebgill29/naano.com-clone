import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import { homeForRole, navForRole } from "@/components/workspace/nav";
import { requireRole } from "@/lib/auth/session";

export default async function BrandWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireRole("brand");

  return (
    <WorkspaceShell
      roleLabel="Brand"
      fullName={profile.full_name}
      homeHref={homeForRole("brand")}
      items={navForRole("brand")}
    >
      {children}
    </WorkspaceShell>
  );
}
