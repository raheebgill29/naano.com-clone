"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  CollaborationMessage,
  UserRole,
} from "@/lib/supabase/database.types";

export type MessageActionState = {
  error?: string;
  success?: string;
  message?: CollaborationMessage;
};

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function messagesBase(role: UserRole) {
  return role === "brand" ? "/brand/messages" : "/creator/messages";
}

export async function sendCollaborationMessageAction(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const role = trimString(formData.get("role")) as UserRole;
  if (role !== "brand" && role !== "creator") {
    return { error: "Invalid role." };
  }
  await requireRole(role);

  const id = trimString(formData.get("campaign_creator_id"));
  const body = trimString(formData.get("body"));
  const clientMessageId = trimString(formData.get("client_message_id")) || null;
  if (!id) return { error: "Missing collaboration id." };
  if (!body) return { error: "Message cannot be blank." };
  if (body.length > 2000) {
    return { error: "Message is too long (max 2000 characters)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("collab_send_message", {
    p_campaign_creator_id: id,
    p_body: body,
    p_client_message_id: clientMessageId,
  });

  if (error) return { error: error.message };

  revalidatePath(messagesBase(role));
  revalidatePath(`${messagesBase(role)}/${id}`);
  revalidatePath(`/${role}/collaborations/${id}`);
  revalidatePath(`/${role}/dashboard`);

  return {
    success: "Message sent.",
    message: data as CollaborationMessage,
  };
}
