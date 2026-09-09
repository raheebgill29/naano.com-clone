import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = "/auth/role-recovery";
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profile) {
          if (!profile.onboarding_completed) {
            destination =
              profile.role === "brand"
                ? "/brand/onboarding"
                : "/creator/onboarding";
          } else {
            destination =
              profile.role === "brand"
                ? "/brand/dashboard"
                : "/creator/dashboard";
          }
        } else if (!profileError && !profile) {
          const metaRole = roleFromMetadata(user.user_metadata?.role);
          const metaName =
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name.trim()
              : "";
          if (metaRole && metaName) {
            const { error: ensureError } = await supabase.rpc(
              "ensure_own_profile",
              {
                p_role: metaRole,
                p_full_name: metaName,
              },
            );
            if (!ensureError) {
              destination =
                metaRole === "brand"
                  ? "/brand/onboarding"
                  : "/creator/onboarding";
            }
          }
        }
      }

      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : destination;

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
