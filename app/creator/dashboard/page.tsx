import { LogoutButton } from "@/components/auth/logout-button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorDashboardPage() {
  const { profile, userId } = await requireRole("creator");
  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("headline")
    .eq("profile_id", userId)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Creator dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            {creator?.headline ?? "Your creator profile"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Signed in as {profile.full_name}. Opportunities will appear here
            next.
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
