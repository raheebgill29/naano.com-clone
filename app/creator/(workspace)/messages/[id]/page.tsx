import { notFound } from "next/navigation";

import { MessagesConversationPage } from "@/components/messages/pages";
import { requireRole } from "@/lib/auth/session";

export default async function CreatorMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("creator");
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <MessagesConversationPage role="creator" id={id} />;
}
