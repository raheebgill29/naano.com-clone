import { MessagesInboxPage } from "@/components/messages/pages";
import { requireRole } from "@/lib/auth/session";

export default async function CreatorMessagesPage() {
  await requireRole("creator");
  return <MessagesInboxPage role="creator" />;
}
