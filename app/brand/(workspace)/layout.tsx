import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/shell";
import {
  homeForRole,
  navGroupsForRole,
  workspaceLabelForRole,
} from "@/components/workspace/nav";
import { requireRole } from "@/lib/auth/session";
import { countUnreadMessages } from "@/lib/messages/queries";
import { listNotifications } from "@/lib/notifications/queries";

export default async function BrandWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, userId } = await requireRole("brand");
  const [{ items, unreadCount }, unreadMessages] = await Promise.all([
    listNotifications(25),
    countUnreadMessages("brand"),
  ]);

  return (
    <WorkspaceShell
      roleLabel="Brand"
      workspaceLabel={workspaceLabelForRole("brand")}
      fullName={profile.full_name}
      homeHref={homeForRole("brand")}
      groups={navGroupsForRole("brand")}
      badges={{
        messages: unreadMessages.count,
      }}
      notifications={items}
      unreadNotifications={unreadCount}
      recipientProfileId={userId}
      wide
    >
      {children}
    </WorkspaceShell>
  );
}
