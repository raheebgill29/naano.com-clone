"use server";

import { redirect } from "next/navigation";

import { requireOnboarding } from "@/lib/auth/session";
import { buildUniqueSlug } from "@/lib/creators/card";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
  success?: string;
};

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function completeBrandOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { userId } = await requireOnboarding("brand");
  const companyName = trimString(formData.get("company_name"));
  const website = trimString(formData.get("website")) || null;
  const industry = trimString(formData.get("industry")) || null;
  const description = trimString(formData.get("description")) || null;

  if (!companyName) {
    return { error: "Company name is required." };
  }

  const supabase = await createClient();

  const { error: brandError } = await supabase.from("brands").upsert(
    {
      profile_id: userId,
      company_name: companyName,
      website,
      industry,
      description,
    },
    { onConflict: "profile_id" },
  );

  if (brandError) {
    return { error: brandError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (profileError) {
    return { error: profileError.message };
  }

  redirect("/brand/dashboard");
}

export async function completeCreatorOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { userId, profile } = await requireOnboarding("creator");
  const headline = trimString(formData.get("headline"));
  const bio = trimString(formData.get("bio")) || null;
  const topicsRaw = trimString(formData.get("topics"));
  const audienceSizeRaw = trimString(formData.get("audience_size"));
  const audienceSummary =
    trimString(formData.get("audience_summary")) || null;
  const priceRaw = trimString(formData.get("price_cents"));
  const linkedinUrl = trimString(formData.get("linkedin_url")) || null;

  const audienceSize = Number(audienceSizeRaw);
  const priceCents = Number(priceRaw);
  const topics = topicsRaw
    ? topicsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (!headline) {
    return { error: "Headline is required." };
  }
  if (!Number.isFinite(audienceSize) || audienceSize < 0) {
    return { error: "Audience size must be a non-negative number." };
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { error: "Price (cents) must be a non-negative number." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("creators")
    .select("slug")
    .eq("profile_id", userId)
    .maybeSingle();

  const slug =
    existing?.slug ?? buildUniqueSlug(profile.full_name || "creator", userId);

  const { error: creatorError } = await supabase.from("creators").upsert(
    {
      profile_id: userId,
      slug,
      headline,
      bio,
      topics,
      audience_size: Math.trunc(audienceSize),
      audience_summary: audienceSummary,
      price_cents: Math.trunc(priceCents),
      currency: "USD",
      linkedin_url: linkedinUrl,
      languages: [],
      location: null,
      publication_status: "draft",
      availability: "available",
    },
    { onConflict: "profile_id" },
  );

  if (creatorError) {
    return { error: creatorError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (profileError) {
    return { error: profileError.message };
  }

  redirect("/creator/dashboard");
}
