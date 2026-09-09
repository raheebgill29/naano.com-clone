import { MessagesInboxPage } from "@/components/messages/pages";
import { requireRole } from "@/lib/auth/session";

export default async function BrandMessagesPage() {
  await requireRole("brand");
  return <MessagesInboxPage role="brand" />;
}
