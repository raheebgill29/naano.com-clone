import type { Notification } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function listNotifications(limit = 20): Promise<{
  items: Notification[];
  unreadCount: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0, error: "Not signed in." };

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("recipient_profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_profile_id", user.id)
      .is("read_at", null),
  ]);

  if (error) return { items: [], unreadCount: 0, error: error.message };
  return {
    items: (data ?? []) as Notification[],
    unreadCount: count ?? 0,
    error: null,
  };
}

export async function countUnreadNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Not signed in." };

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", user.id)
    .is("read_at", null);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null as string | null };
}
