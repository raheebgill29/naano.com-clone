"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  const id = String(formData.get("notification_id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", {
    p_notification_id: id,
  });

  revalidatePath("/brand/dashboard");
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/messages");
  revalidatePath("/creator/messages");
  revalidatePath("/brand/collaborations");
  revalidatePath("/creator/collaborations");
  revalidatePath("/creator/opportunities");
  revalidatePath("/brand/campaigns");
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");

  revalidatePath("/brand/dashboard");
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/messages");
  revalidatePath("/creator/messages");
  revalidatePath("/brand/collaborations");
  revalidatePath("/creator/collaborations");
  revalidatePath("/creator/opportunities");
  revalidatePath("/brand/campaigns");
}
