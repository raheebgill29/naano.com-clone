"use server";

import { revalidatePath } from "next/cache";

import {
  buildUniqueSlug,
  getPublishRequirements,
  parseCommaList,
} from "@/lib/creators/card";
import { requireRole } from "@/lib/auth/session";
import type {
  AvailabilityStatus,
  PublicationStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CreatorCardActionState = {
  error?: string;
  success?: string;
  missing?: string[];
};

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCardForm(formData: FormData) {
  const fullName = trimString(formData.get("full_name"));
  const headline = trimString(formData.get("headline"));
  const bio = trimString(formData.get("bio")) || null;
  const linkedinUrl = trimString(formData.get("linkedin_url")) || null;
  const location = trimString(formData.get("location")) || null;
  const languages = parseCommaList(trimString(formData.get("languages")));
  const topics = parseCommaList(trimString(formData.get("topics")));
  const audienceSummary =
    trimString(formData.get("audience_summary")) || null;
  const audienceSizeRaw = trimString(formData.get("audience_size"));
  const priceRaw = trimString(formData.get("price_cents"));
  const currency = trimString(formData.get("currency")) || "USD";
  const availabilityRaw = trimString(formData.get("availability"));
  const availability: AvailabilityStatus =
    availabilityRaw === "unavailable" ? "unavailable" : "available";

  const audienceSize = audienceSizeRaw === "" ? null : Number(audienceSizeRaw);
  const priceCents = priceRaw === "" ? null : Number(priceRaw);

  return {
    fullName,
    headline,
    bio,
    linkedinUrl,
    location,
    languages,
    topics,
    audienceSummary,
    audienceSize,
    priceCents,
    currency: currency.toUpperCase(),
    availability,
  };
}

async function upsertCreatorCard(
  formData: FormData,
  publicationStatus: PublicationStatus,
): Promise<CreatorCardActionState> {
  const { userId } = await requireRole("creator");
  const parsed = parseCardForm(formData);

  if (!parsed.fullName) {
    return { error: "Display name is required." };
  }
  if (!parsed.headline) {
    return { error: "Headline is required." };
  }
  if (
    parsed.audienceSize === null ||
    !Number.isFinite(parsed.audienceSize) ||
    parsed.audienceSize < 0
  ) {
    return { error: "Follower count must be a non-negative number." };
  }
  if (
    parsed.priceCents === null ||
    !Number.isFinite(parsed.priceCents) ||
    parsed.priceCents < 0
  ) {
    return { error: "Price per post (cents) must be a non-negative number." };
  }

  if (publicationStatus === "published") {
    const gate = getPublishRequirements({
      fullName: parsed.fullName,
      headline: parsed.headline,
      topics: parsed.topics,
      audienceSize: parsed.audienceSize,
      priceCents: parsed.priceCents,
      currency: parsed.currency,
    });
    if (!gate.ready) {
      return {
        error: "Complete the required fields before publishing.",
        missing: gate.missing,
      };
    }
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("creators")
    .select("id, slug")
    .eq("profile_id", userId)
    .maybeSingle();

  const slug =
    existing?.slug ?? buildUniqueSlug(parsed.fullName, userId);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.fullName })
    .eq("id", userId);

  if (profileError) {
    return { error: profileError.message };
  }

  const payload = {
    profile_id: userId,
    slug,
    headline: parsed.headline,
    bio: parsed.bio,
    topics: parsed.topics,
    audience_size: Math.trunc(parsed.audienceSize),
    audience_summary: parsed.audienceSummary,
    price_cents: Math.trunc(parsed.priceCents),
    currency: parsed.currency,
    linkedin_url: parsed.linkedinUrl,
    location: parsed.location,
    languages: parsed.languages,
    publication_status: publicationStatus,
    availability: parsed.availability,
  };

  const { error: creatorError } = existing
    ? await supabase
        .from("creators")
        .update({
          headline: payload.headline,
          bio: payload.bio,
          topics: payload.topics,
          audience_size: payload.audience_size,
          audience_summary: payload.audience_summary,
          price_cents: payload.price_cents,
          currency: payload.currency,
          linkedin_url: payload.linkedin_url,
          location: payload.location,
          languages: payload.languages,
          publication_status: payload.publication_status,
          availability: payload.availability,
        })
        .eq("profile_id", userId)
    : await supabase.from("creators").insert(payload);

  if (creatorError) {
    return { error: creatorError.message };
  }

  revalidatePath("/creator/card");
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/discover");

  return {
    success:
      publicationStatus === "published"
        ? "Card published. Brands can discover it in the marketplace."
        : "Draft saved.",
  };
}

export async function saveCreatorCardDraft(
  _prev: CreatorCardActionState,
  formData: FormData,
) {
  return upsertCreatorCard(formData, "draft");
}

export async function publishCreatorCard(
  _prev: CreatorCardActionState,
  formData: FormData,
) {
  return upsertCreatorCard(formData, "published");
}

export async function unpublishCreatorCard(): Promise<CreatorCardActionState> {
  const { userId } = await requireRole("creator");
  const supabase = await createClient();

  const { error } = await supabase
    .from("creators")
    .update({ publication_status: "draft" })
    .eq("profile_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/creator/card");
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/discover");

  return { success: "Card moved back to draft and hidden from the marketplace." };
}
