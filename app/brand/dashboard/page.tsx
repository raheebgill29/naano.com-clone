import { LogoutButton } from "@/components/auth/logout-button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function BrandDashboardPage() {
  const { profile, userId } = await requireRole("brand");
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("company_name")
    .eq("profile_id", userId)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Brand dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            {brand?.company_name ?? "Your brand"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Signed in as {profile.full_name}. Creator discovery and campaigns
            will live here next.
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
