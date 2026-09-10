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
import { createClient } from "@/lib/supabase/server";

export default async function CreatorWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, userId } = await requireRole("creator");
  const supabase = await createClient();

  const [{ items, unreadCount }, unreadMessages, { data: creator }] =
    await Promise.all([
      listNotifications(25),
      countUnreadMessages("creator"),
      supabase
        .from("creators")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle(),
    ]);

  let pendingOpportunities = 0;
  if (creator?.id) {
    const { count } = await supabase
      .from("campaign_creators")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("status", "booking_pending");
    pendingOpportunities = count ?? 0;
  }

  return (
    <WorkspaceShell
      roleLabel="Creator"
      workspaceLabel={workspaceLabelForRole("creator")}
      fullName={profile.full_name}
      homeHref={homeForRole("creator")}
      groups={navGroupsForRole("creator")}
      badges={{
        messages: unreadMessages.count,
        opportunities: pendingOpportunities,
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
