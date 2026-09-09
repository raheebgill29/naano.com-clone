import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import { homeForRole, navForRole } from "@/components/workspace/nav";
import { requireRole } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/queries";

export default async function CreatorWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, userId } = await requireRole("creator");
  const { items, unreadCount } = await listNotifications(25);

  return (
    <WorkspaceShell
      roleLabel="Creator"
      fullName={profile.full_name}
      homeHref={homeForRole("creator")}
      items={navForRole("creator")}
      notifications={items}
      unreadNotifications={unreadCount}
      recipientProfileId={userId}
    >
      {children}
    </WorkspaceShell>
  );
}
