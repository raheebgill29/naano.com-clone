import { CreatorCardEditor } from "@/components/creator/card-editor";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorCardPage() {
  const { profile, userId } = await requireRole("creator");
  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  return <CreatorCardEditor profile={profile} creator={creator} />;
}
