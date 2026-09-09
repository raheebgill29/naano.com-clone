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

  const userId = data.user?.id;
  if (!userId) {
    return { error: "Sign-in succeeded but no user was returned." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return {
      error:
        "Signed in, but no profile was found. Contact support or try signing up again.",
    };
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (safeNext) {
    redirect(safeNext);
  }

  if (!profile.onboarding_completed) {
    redirect(
      profile.role === "brand" ? "/brand/onboarding" : "/creator/onboarding",
    );
  }

  redirect(
    profile.role === "brand" ? "/brand/dashboard" : "/creator/dashboard",
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
