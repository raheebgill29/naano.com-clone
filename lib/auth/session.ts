import { redirect } from "next/navigation";

import type { Profile, UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null };
  }
  return { supabase, user: data.user };
}

export async function getCurrentProfile(): Promise<{
  profile: Profile | null;
  userId: string | null;
}> {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return { profile: null, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { profile, userId: user.id };
}

export async function requireAuth(): Promise<{
  profile: Profile;
  userId: string;
}> {
  const { profile, userId } = await getCurrentProfile();
  if (!userId || !profile) {
    redirect("/login");
  }
  return { profile, userId };
}

export async function requireRole(role: UserRole) {
  const { profile, userId } = await requireAuth();
  if (profile.role !== role) {
    redirect(
      profile.role === "brand" ? "/brand/dashboard" : "/creator/dashboard",
    );
  }
  if (!profile.onboarding_completed) {
    redirect(role === "brand" ? "/brand/onboarding" : "/creator/onboarding");
  }
  return { profile, userId };
}

export async function requireOnboarding(role: UserRole) {
  const { profile, userId } = await requireAuth();
  if (profile.role !== role) {
    redirect(
      profile.role === "brand" ? "/brand/onboarding" : "/creator/onboarding",
    );
  }
  if (profile.onboarding_completed) {
    redirect(role === "brand" ? "/brand/dashboard" : "/creator/dashboard");
  }
  return { profile, userId };
}
