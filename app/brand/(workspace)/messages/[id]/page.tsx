import { notFound } from "next/navigation";

import { MessagesConversationPage } from "@/components/messages/pages";
import { requireRole } from "@/lib/auth/session";

export default async function BrandMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("brand");
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <MessagesConversationPage role="brand" id={id} />;
}
