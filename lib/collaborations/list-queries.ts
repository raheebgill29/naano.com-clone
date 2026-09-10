import {
  listBrandCollaborations,
  listCreatorCollaborations,
} from "@/lib/collaborations/queries";
import type { CollaborationListItem } from "@/lib/collaborations/list-data";
import { listMessageInbox } from "@/lib/messages/queries";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

export async function loadBrandCollaborationList(brandId: string): Promise<{
  items: CollaborationListItem[];
  error: string | null;
  loadedAtMs: number;
}> {
  const loadedAtMs = Date.now();
  const [{ items, error }, inbox] = await Promise.all([
    listBrandCollaborations({ brandId, filter: "all" }),
    listMessageInbox("brand"),
  ]);

  if (error) return { items: [], error, loadedAtMs };

  const unreadById = new Map(
    inbox.items.map((row) => [row.id, row.unread] as const),
  );

  return {
    items: items.map((row) => ({
      id: row.id,
      status: row.status as CampaignCreatorStatus,
      price_cents: row.price_cents,
      currency: row.currency,
      post_count_snapshot: row.post_count_snapshot,
      updated_at: row.updated_at,
      scheduled_publish_at: row.scheduled_publish_at,
      published_url: row.published_url,
      campaignId: row.campaign?.id ?? row.campaign_id ?? null,
      campaignName: row.campaign?.campaign_name ?? "Campaign",
      deliverableType: row.campaign?.deliverable_type ?? "Deliverable",
      targetPublishDate: row.campaign?.target_publish_date ?? null,
      participantName: row.creator?.full_name ?? "Creator",
      participantMeta: row.creator?.headline ?? null,
      unread: unreadById.get(row.id) === true,
      role: "brand" as const,
    })),
    error: null,
    loadedAtMs,
  };
}

export async function loadCreatorCollaborationList(creatorId: string): Promise<{
  items: CollaborationListItem[];
  error: string | null;
  loadedAtMs: number;
}> {
  const loadedAtMs = Date.now();
  const [{ items, error }, inbox] = await Promise.all([
    listCreatorCollaborations({ creatorId, filter: "all" }),
    listMessageInbox("creator"),
  ]);

  if (error) return { items: [], error, loadedAtMs };

  const unreadById = new Map(
    inbox.items.map((row) => [row.id, row.unread] as const),
  );

  return {
    items: items.map((row) => ({
      id: row.id,
      status: row.status as CampaignCreatorStatus,
      price_cents: row.price_cents,
      currency: row.currency,
      post_count_snapshot: row.post_count_snapshot,
      updated_at: row.updated_at,
      scheduled_publish_at: row.scheduled_publish_at,
      published_url: row.published_url,
      campaignId: row.campaign?.id ?? row.campaign_id ?? null,
      campaignName: row.campaign?.campaign_name ?? "Campaign",
      deliverableType: row.campaign?.deliverable_type ?? "Deliverable",
      targetPublishDate: row.campaign?.target_publish_date ?? null,
      participantName: row.brand?.company_name ?? "Brand",
      participantMeta: row.campaign?.product_or_company ?? null,
      unread: unreadById.get(row.id) === true,
      role: "creator" as const,
    })),
    error: null,
    loadedAtMs,
  };
}
