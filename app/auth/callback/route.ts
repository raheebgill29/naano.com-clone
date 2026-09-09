import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

      let destination = "/login";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
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
