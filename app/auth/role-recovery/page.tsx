import { redirect } from "next/navigation";

import { RoleRecoveryForm } from "@/components/auth/role-recovery-form";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";

function roleFromMetadata(value: unknown): UserRole | null {
  if (value === "brand" || value === "creator") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "brand" || normalized === "creator") return normalized;
  }
  return null;
}

export default async function RoleRecoveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    redirect(
      !profile.onboarding_completed
        ? profile.role === "brand"
          ? "/brand/onboarding"
          : "/creator/onboarding"
        : profile.role === "brand"
          ? "/brand/dashboard"
          : "/creator/dashboard",
    );
  }

  const suggestedRole = roleFromMetadata(user.user_metadata?.role);
  const defaultName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return (
    <RoleRecoveryForm
      defaultName={defaultName}
      suggestedRole={suggestedRole}
    />
  );
}
