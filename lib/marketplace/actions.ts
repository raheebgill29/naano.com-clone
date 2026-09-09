"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SaveCreatorState = {
  error?: string;
  success?: string;
};

async function getBrandId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function saveCreator(
  creatorId: string,
): Promise<SaveCreatorState> {
  const { userId } = await requireRole("brand");
  const brandId = await getBrandId(userId);
  if (!brandId) {
    return { error: "Brand profile not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("saved_creators").insert({
    brand_id: brandId,
    creator_id: creatorId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: "Creator already saved." };
    }
    return { error: error.message };
  }

  revalidatePath("/brand/discover");
  revalidatePath("/brand/shortlist");
  revalidatePath(`/brand/creators`);

  return { success: "Creator saved to your shortlist." };
}

export async function unsaveCreator(
  creatorId: string,
): Promise<SaveCreatorState> {
  const { userId } = await requireRole("brand");
  const brandId = await getBrandId(userId);
  if (!brandId) {
    return { error: "Brand profile not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_creators")
    .delete()
    .eq("brand_id", brandId)
    .eq("creator_id", creatorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/brand/discover");
  revalidatePath("/brand/shortlist");
  revalidatePath(`/brand/creators`);

  return { success: "Creator removed from your shortlist." };
}
