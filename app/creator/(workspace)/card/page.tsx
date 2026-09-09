import { CreatorCardEditor } from "@/components/creator/card-editor";
import { PageHeader } from "@/components/workspace/ui";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My card"
        title="Creator card"
        description="Manage your public marketplace profile. Save a draft anytime; publish when the required fields are complete."
      />
      <CreatorCardEditor profile={profile} creator={creator} />
    </div>
  );
}
