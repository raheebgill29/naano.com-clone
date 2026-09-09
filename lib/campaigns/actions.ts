"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type {
  CampaignCreatorStatus,
  CampaignStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CampaignFormActionState = {
  error?: string;
  success?: string;
};

export type InviteActionState = {
  error?: string;
  success?: string;
};

export type OpportunityActionState = {
  error?: string;
  success?: string;
};

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCommaOrNewlineList(raw: string) {
  return raw
    .split(/[\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseRequiredInt(raw: string) {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseMoneyCents(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseDateToISOString(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function saveBrandCampaign(
  _prev: CampaignFormActionState,
  formData: FormData,
): Promise<CampaignFormActionState> {
  const { userId } = await requireRole("brand");
  const supabase = await createClient();

  const campaignId = trimString(formData.get("campaign_id"));
  const inviteCreatorId = trimString(formData.get("invite_creator_id"));

  const campaign_name = trimString(formData.get("campaign_name"));
  const product_or_company = trimString(formData.get("product_or_company"));
  const objective = trimString(formData.get("objective"));
  const description = trimString(formData.get("description"));
  const creator_guidelines = trimString(formData.get("creator_guidelines"));
  const deliverable_type = trimString(formData.get("deliverable_type"));

  const keyMessagesRaw = trimString(formData.get("key_messages"));
  const key_messages = parseCommaOrNewlineList(keyMessagesRaw);

  const post_countRaw = trimString(formData.get("post_count"));
  const post_count = parseRequiredInt(post_countRaw);

  const target_publish_dateRaw = trimString(
    formData.get("target_publish_date"),
  );
  const target_publish_date = parseDateToISOString(
    target_publish_dateRaw,
  );

  const currencyRaw = trimString(formData.get("currency")).toUpperCase();
  const currency = currencyRaw || "USD";

  const budgetCentsRaw = trimString(formData.get("budget_cents"));
  const budget_centsParsed = parseMoneyCents(budgetCentsRaw);

  const statusRaw = trimString(formData.get("status"));
  const status: CampaignStatus =
    statusRaw === "active" ? "active" : "draft";

  if (!campaign_name) return { error: "Campaign name is required." };
  if (!product_or_company)
    return { error: "Product/company is required." };
  if (!objective) return { error: "Objective is required." };
  if (!description) return { error: "Description is required." };
  if (!creator_guidelines)
    return { error: "Creator guidelines are required." };
  if (!deliverable_type)
    return { error: "Deliverable type is required." };
  if (key_messages.length === 0)
    return { error: "Key messages are required (add at least one)." };
  if (!post_count || post_count <= 0)
    return { error: "Number of posts must be a positive integer." };
  if (!target_publish_date)
    return { error: "Target publish date must be a valid date." };
  if (budget_centsParsed == null || budget_centsParsed < 0)
    return { error: "Budget must be a non-negative amount in cents." };
  if (!currency) return { error: "Currency is required." };

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!brand?.id) return { error: "Brand profile not found." };
  const brandId = brand.id;

  const payload = {
    brand_id: brandId,
    campaign_name,
    product_or_company,
    objective,
    description,
    key_messages,
    creator_guidelines,
    deliverable_type,
    post_count,
    target_publish_date,
    currency,
    budget_cents: budget_centsParsed,
    status,
  };

  // Edit existing draft
  if (campaignId) {
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id,status")
      .eq("id", campaignId)
      .eq("brand_id", brandId)
      .maybeSingle();

    if (!existing) {
      return { error: "Campaign not found." };
    }
    if (existing.status !== "draft") {
      return { error: "Only draft campaigns can be edited." };
    }

    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", campaignId);

    if (error) return { error: error.message };

    if (inviteCreatorId) {
      // Best-effort invite after draft save.
      await inviteCreatorToCampaignInternal({
        supabase,
        brandId,
        campaignId,
        creatorId: inviteCreatorId,
      });
    }

    revalidatePath("/brand/campaigns");
    revalidatePath(`/brand/campaigns/${campaignId}`);
    redirect(`/brand/campaigns/${campaignId}`);
  }

  // Create new campaign draft
  const { data: created, error: createdErr } = await supabase
    .from("campaigns")
    .insert(payload)
    .select("id")
    .single();

  if (createdErr) return { error: createdErr.message };
  const newCampaignId = created?.id as string | undefined;

  if (!newCampaignId) return { error: "Failed to create campaign." };

  if (inviteCreatorId) {
    await inviteCreatorToCampaignInternal({
      supabase,
      brandId,
      campaignId: newCampaignId,
      creatorId: inviteCreatorId,
    });
  }

  revalidatePath("/brand/campaigns");
  revalidatePath(`/brand/campaigns/${newCampaignId}`);
  redirect(`/brand/campaigns/${newCampaignId}`);
}

async function inviteCreatorToCampaignInternal({
  supabase,
  brandId,
  campaignId,
  creatorId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  brandId: string;
  campaignId: string;
  creatorId: string;
}) {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,post_count,status")
    .eq("id", campaignId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!campaign) return { error: "Campaign not found." };

  // Archived campaigns cannot accept new invites in this slice
  if (campaign.status === "archived") return { error: "Campaign is archived." };

  const { data: creator } = await supabase
    .from("creators")
    .select("id,price_cents,currency,publication_status,availability,is_discoverable")
    .eq("id", creatorId)
    .maybeSingle();
  if (!creator) return { error: "Creator not found." };

  if (
    creator.publication_status !== "published" ||
    creator.availability !== "available" ||
    !creator.is_discoverable
  ) {
    return { error: "Creator is not eligible for invitations." };
  }

  const post_count_snapshot = campaign.post_count;

  const { error } = await supabase.from("campaign_creators").insert({
    campaign_id: campaignId,
    creator_id: creatorId,
    status: "booking_pending" satisfies CampaignCreatorStatus,
    price_cents: creator.price_cents,
    currency: creator.currency,
    post_count_snapshot,
  });

  if (!error) return { ok: true };
  // Unique violation -> already invited.
  if (error.code === "23505") {
    return { error: "This creator is already invited to this campaign." };
  }
  return { error: error.message };
}

export async function archiveCampaign(formData: FormData): Promise<void> {
  const { userId } = await requireRole("brand");
  const supabase = await createClient();

  const campaignId = trimString(formData.get("campaign_id"));
  if (!campaignId) {
    redirect("/brand/campaigns?error=missing-campaign");
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!brand?.id) {
    redirect("/brand/campaigns?error=brand-missing");
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,status")
    .eq("id", campaignId)
    .eq("brand_id", brand.id)
    .maybeSingle();

  if (!campaign || campaign.status !== "draft") {
    redirect(`/brand/campaigns/${campaignId}`);
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("campaigns")
    .update({ status: "archived" satisfies CampaignStatus })
    .eq("id", campaignId);

  await supabase
    .from("campaign_creators")
    .update({
      status: "cancelled" satisfies CampaignCreatorStatus,
      cancelled_at: nowIso,
    })
    .eq("campaign_id", campaignId)
    .eq("status", "booking_pending");

  revalidatePath("/brand/campaigns");
  revalidatePath(`/brand/campaigns/${campaignId}`);
  redirect("/brand/campaigns");
}

export async function inviteCreatorToCampaign(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const { userId } = await requireRole("brand");
  const supabase = await createClient();

  const creatorId = trimString(formData.get("creator_id"));
  const campaignId = trimString(formData.get("campaign_id"));
  if (!creatorId || !campaignId) {
    return { error: "Missing creator or campaign id." };
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!brand?.id) return { error: "Brand profile not found." };

  const result = await inviteCreatorToCampaignInternal({
    supabase,
    brandId: brand.id,
    campaignId,
    creatorId,
  });

  if ("error" in result && result.error) {
    // Unique violation is treated as already-invited.
    return { error: result.error };
  }

  revalidatePath("/brand/discover");
  revalidatePath("/brand/campaigns");
  revalidatePath(`/brand/campaigns/${campaignId}`);
  revalidatePath("/creator/opportunities");
  return { success: "Invitation sent." };
}

export async function withdrawInvitation(formData: FormData): Promise<void> {
  const { userId } = await requireRole("brand");
  const supabase = await createClient();

  const campaign_creator_id = trimString(formData.get("campaign_creator_id"));
  if (!campaign_creator_id) {
    redirect("/brand/campaigns");
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!brand?.id) {
    redirect("/brand/campaigns");
  }

  const { data: inv } = await supabase
    .from("campaign_creators")
    .select("id,status,campaign_id,creator_id")
    .eq("id", campaign_creator_id)
    .maybeSingle();

  if (!inv || inv.status !== "booking_pending") {
    redirect("/brand/campaigns");
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,brand_id")
    .eq("id", inv.campaign_id)
    .maybeSingle();

  if (!campaign || campaign.brand_id !== brand.id) {
    redirect("/brand/campaigns");
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("campaign_creators")
    .update({
      status: "cancelled" satisfies CampaignCreatorStatus,
      cancelled_at: nowIso,
    })
    .eq("id", campaign_creator_id);

  revalidatePath(`/brand/campaigns/${inv.campaign_id}`);
  revalidatePath(`/creator/opportunities`);
  redirect(`/brand/campaigns/${inv.campaign_id}`);
}

export async function acceptOpportunity(formData: FormData): Promise<void> {
  const { userId } = await requireRole("creator");
  const supabase = await createClient();

  const campaign_creator_id = trimString(formData.get("campaign_creator_id"));
  if (!campaign_creator_id) {
    redirect("/creator/opportunities");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  const creatorId = creator?.id;
  if (!creatorId) {
    redirect("/creator/opportunities");
  }

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("campaign_creators")
    .select("id,status,creator_id")
    .eq("id", campaign_creator_id)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (!existing || existing.status !== "booking_pending") {
    redirect(`/creator/opportunities/${campaign_creator_id}`);
  }

  await supabase
    .from("campaign_creators")
    .update({
      status: "accepted" satisfies CampaignCreatorStatus,
      accepted_at: nowIso,
    })
    .eq("id", campaign_creator_id);

  revalidatePath("/creator/opportunities");
  revalidatePath("/creator/collaborations");
  revalidatePath(`/creator/opportunities/${campaign_creator_id}`);
  redirect("/creator/collaborations");
}

export async function declineOpportunity(formData: FormData): Promise<void> {
  const { userId } = await requireRole("creator");
  const supabase = await createClient();

  const campaign_creator_id = trimString(formData.get("campaign_creator_id"));
  const decline_reason = trimString(formData.get("decline_reason"));
  if (!campaign_creator_id) {
    redirect("/creator/opportunities");
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  const creatorId = creator?.id;
  if (!creatorId) {
    redirect("/creator/opportunities");
  }

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("campaign_creators")
    .select("id,status,creator_id")
    .eq("id", campaign_creator_id)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (!existing || existing.status !== "booking_pending") {
    redirect(`/creator/opportunities/${campaign_creator_id}`);
  }

  await supabase
    .from("campaign_creators")
    .update({
      status: "declined" satisfies CampaignCreatorStatus,
      declined_at: nowIso,
      decline_reason: decline_reason || null,
    })
    .eq("id", campaign_creator_id);

  revalidatePath("/creator/opportunities");
  redirect("/creator/opportunities");
}

