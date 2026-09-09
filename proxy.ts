import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

function isAuthFormPath(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

function homeForRole(role: "brand" | "creator", onboarded: boolean) {
  if (!onboarded) {
    return role === "brand" ? "/brand/onboarding" : "/creator/onboarding";
  }
  return role === "brand" ? "/brand/dashboard" : "/creator/dashboard";
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, userId, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!userId) {
    if (!isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  // Profile should exist via signup trigger; avoid redirect loops if it does not.
  if (!profile) {
    if (
      isAuthFormPath(pathname) ||
      pathname.startsWith("/auth/") ||
      pathname === "/auth/role-recovery"
    ) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/role-recovery";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const home = homeForRole(profile.role, profile.onboarding_completed);

  if (isAuthFormPath(pathname) || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!profile.onboarding_completed) {
    const onboardingPath = homeForRole(profile.role, false);
    if (pathname !== onboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = onboardingPath;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Completed users should not stay on onboarding.
  if (
    pathname === "/brand/onboarding" ||
    pathname === "/creator/onboarding"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Soft role isolation in proxy (server layouts still enforce).
  if (pathname.startsWith("/brand/") && profile.role !== "brand") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/creator/") && profile.role !== "creator") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
