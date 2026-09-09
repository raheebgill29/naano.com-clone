"use server";

import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function asRole(value: FormDataEntryValue | null): UserRole | null {
  if (value === "brand" || value === "creator") return value;
  return null;
}

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function roleFromMetadata(value: unknown): UserRole | null {
  if (value === "brand" || value === "creator") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "brand" || normalized === "creator") return normalized;
  }
  return null;
}

async function loadOwnProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  return supabase
    .from("profiles")
    .select("role, onboarding_completed, full_name")
    .eq("id", userId)
    .maybeSingle();
}

function destinationForProfile(profile: {
  role: UserRole;
  onboarding_completed: boolean;
}) {
  if (!profile.onboarding_completed) {
    return profile.role === "brand" ? "/brand/onboarding" : "/creator/onboarding";
  }
  return profile.role === "brand" ? "/brand/dashboard" : "/creator/dashboard";
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = trimString(formData.get("email"));
  const password = trimString(formData.get("password"));
  const fullName = trimString(formData.get("full_name"));
  const role = asRole(formData.get("role"));

  if (!email || !password || !fullName || !role) {
    return { error: "Name, email, password, and role are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
      },
      emailRedirectTo: origin
        ? `${origin}/auth/callback`
        : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      success:
        "Account created. Check your email to confirm, then sign in.",
    };
  }

  redirect(role === "brand" ? "/brand/onboarding" : "/creator/onboarding");
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = trimString(formData.get("email"));
  const password = trimString(formData.get("password"));
  const next = trimString(formData.get("next")) || "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user?.id) {
    return { error: "Sign-in succeeded but no user was returned." };
  }

  const { data: profile, error: profileError } = await loadOwnProfile(
    supabase,
    user.id,
  );

  if (profileError) {
    return {
      error:
        "Signed in, but your profile could not be loaded. Please try again.",
    };
  }

  if (!profile) {
    const metaRole = roleFromMetadata(user.user_metadata?.role);
    const metaName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    // Recoverable role from validated signup metadata → create missing base row.
    if (metaRole && metaName) {
      const { error: ensureError } = await supabase.rpc("ensure_own_profile", {
        p_role: metaRole,
        p_full_name: metaName,
      });

      if (!ensureError) {
        redirect(
          metaRole === "brand" ? "/brand/onboarding" : "/creator/onboarding",
        );
      }
    }

    redirect("/auth/role-recovery");
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (safeNext) {
    redirect(safeNext);
  }

  redirect(destinationForProfile(profile));
}

export async function completeRoleRecoveryAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const role = asRole(formData.get("role"));
  const fullName = trimString(formData.get("full_name"));

  if (!role || !fullName) {
    return { error: "Choose a role and enter your name to continue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { data: existing, error: existingError } = await loadOwnProfile(
    supabase,
    user.id,
  );

  if (existingError) {
    return { error: "Could not verify your profile. Please try again." };
  }

  if (existing) {
    redirect(destinationForProfile(existing));
  }

  // Prefer validated metadata role when present; never overwrite an existing role.
  const metaRole = roleFromMetadata(user.user_metadata?.role);
  const resolvedRole = metaRole ?? role;
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const resolvedName = metaName || fullName;

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      role: resolvedRole,
      full_name: resolvedName,
    },
  });

  if (metaError) {
    return { error: metaError.message };
  }

  // Profile INSERT is intentionally not granted to clients (trigger-owned).
  // Ask for a secure RPC that only creates the caller's missing row.
  const { error: rpcError } = await supabase.rpc("ensure_own_profile", {
    p_role: resolvedRole,
    p_full_name: resolvedName,
  });

  if (rpcError) {
    return {
      error:
        rpcError.message ||
        "Could not create your profile. Please try again.",
    };
  }

  redirect(
    resolvedRole === "brand" ? "/brand/onboarding" : "/creator/onboarding",
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
