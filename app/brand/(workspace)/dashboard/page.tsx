import { BrandOverview } from "@/components/brand/overview";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function BrandDashboardPage() {
  const { profile, userId } = await requireRole("brand");
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  return <BrandOverview profile={profile} brand={brand} />;
}
