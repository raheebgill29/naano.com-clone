"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CollabActionState = {
  error?: string;
  success?: string;
};

function trimString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function revalidateCollab(id: string) {
  revalidatePath("/creator", "layout");
  revalidatePath("/brand", "layout");
  revalidatePath("/creator/collaborations");
  revalidatePath(`/creator/collaborations/${id}`);
  revalidatePath("/brand/collaborations");
  revalidatePath(`/brand/collaborations/${id}`);
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/dashboard");
  revalidatePath("/creator/opportunities");
  revalidatePath("/creator/messages");
  revalidatePath(`/creator/messages/${id}`);
  revalidatePath("/brand/messages");
  revalidatePath(`/brand/messages/${id}`);
}

export async function submitDraftAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("creator");
  const id = trimString(formData.get("campaign_creator_id"));
  const body = trimString(formData.get("body"));
  const assetUrl = trimString(formData.get("asset_url"));
  const notes = trimString(formData.get("notes"));

  if (!id) return { error: "Missing collaboration id." };
  if (!body) return { error: "Draft text is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_submit_draft", {
    p_campaign_creator_id: id,
    p_body: body,
    p_asset_url: assetUrl || null,
    p_notes: notes || null,
  });

  if (error) return { error: error.message };
  revalidateCollab(id);
  redirect(`/creator/collaborations/${id}`);
}

export async function requestRevisionAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("brand");
  const id = trimString(formData.get("campaign_creator_id"));
  const feedback = trimString(formData.get("feedback"));
  if (!id) return { error: "Missing collaboration id." };
  if (!feedback) return { error: "Actionable feedback is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_request_revision", {
    p_campaign_creator_id: id,
    p_feedback: feedback,
  });

  if (error) return { error: error.message };
  revalidateCollab(id);
  redirect(`/brand/collaborations/${id}`);
}

export async function approveDraftAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("brand");
  const id = trimString(formData.get("campaign_creator_id"));
  const draftId = trimString(formData.get("content_submission_id"));
  if (!id) return { error: "Missing collaboration id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_approve_draft", {
    p_campaign_creator_id: id,
    ...(draftId ? { p_content_submission_id: draftId } : {}),
  });
  if (error) return { error: error.message };

  revalidateCollab(id);
  redirect(`/brand/collaborations/${id}`);
}

export async function scheduleCollabAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("brand");
  const id = trimString(formData.get("campaign_creator_id"));
  const dateRaw = trimString(formData.get("scheduled_publish_at"));
  if (!id) return { error: "Missing collaboration id." };
  if (!dateRaw) return { error: "Scheduled publish date is required." };

  const scheduled = new Date(dateRaw);
  if (Number.isNaN(scheduled.getTime())) {
    return { error: "Scheduled publish date must be valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_schedule", {
    p_campaign_creator_id: id,
    p_scheduled_publish_at: scheduled.toISOString(),
  });

  if (error) return { error: error.message };
  revalidateCollab(id);
  redirect(`/brand/collaborations/${id}`);
}

export async function submitPublishedUrlAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("creator");
  const id = trimString(formData.get("campaign_creator_id"));
  const url = trimString(formData.get("published_url"));
  if (!id) return { error: "Missing collaboration id." };
  if (!url) return { error: "LinkedIn post URL is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_submit_published_url", {
    p_campaign_creator_id: id,
    p_published_url: url,
  });

  if (error) return { error: error.message };
  revalidateCollab(id);
  redirect(`/creator/collaborations/${id}`);
}

export async function completeCollabAction(formData: FormData): Promise<void> {
  await requireRole("brand");
  const id = trimString(formData.get("campaign_creator_id"));
  if (!id) redirect("/brand/collaborations");

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_complete", {
    p_campaign_creator_id: id,
  });
  if (error) {
    redirect(`/brand/collaborations/${id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidateCollab(id);
  redirect(`/brand/collaborations/${id}`);
}

export async function cancelCollabAction(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  await requireRole("brand");
  const id = trimString(formData.get("campaign_creator_id"));
  const reason = trimString(formData.get("cancel_reason"));
  if (!id) return { error: "Missing collaboration id." };
  if (!reason) return { error: "Cancellation reason is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("collab_cancel", {
    p_campaign_creator_id: id,
    p_reason: reason,
  });

  if (error) return { error: error.message };
  revalidateCollab(id);
  redirect(`/brand/collaborations/${id}`);
}
