import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import { homeForRole, navForRole } from "@/components/workspace/nav";
import { requireRole } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/queries";

export default async function BrandWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, userId } = await requireRole("brand");
  const { items, unreadCount } = await listNotifications(25);

  return (
    <WorkspaceShell
      roleLabel="Brand"
      fullName={profile.full_name}
      homeHref={homeForRole("brand")}
      items={navForRole("brand")}
      notifications={items}
      unreadNotifications={unreadCount}
      recipientProfileId={userId}
    >
      {children}
    </WorkspaceShell>
  );
}
