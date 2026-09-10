import {
  CreatorOverview,
  type PendingOpportunity,
} from "@/components/creator/overview";
import { loadCreatorCollaborationList } from "@/lib/collaborations/list-queries";
import { ACTIVE_COLLAB_STATUSES } from "@/lib/collaborations/queries";
import type { CollaborationListItem } from "@/lib/collaborations/list-data";
import { countUnreadMessages, listMessageInbox } from "@/lib/messages/queries";
import type { InboxItem } from "@/lib/messages/queries";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorDashboardPage() {
  const { profile, userId } = await requireRole("creator");
  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  const checklist = [
    {
      id: "name",
      label: "Display name on profile",
      done: Boolean(profile.full_name?.trim()),
    },
    {
      id: "headline",
      label: "Add a creator headline",
      done: Boolean(creator?.headline?.trim()),
      href: "/creator/card",
    },
    {
      id: "topics",
      label: "Add expertise topics",
      done: Boolean(creator?.topics?.length),
      href: "/creator/card",
    },
    {
      id: "audience",
      label: "Set audience size",
      done: creator?.audience_size != null && creator.audience_size >= 0,
      href: "/creator/card",
    },
    {
      id: "price",
      label: "Set fixed post price",
      done: creator?.price_cents != null && creator.price_cents >= 0,
      href: "/creator/card",
    },
    {
      id: "linkedin",
      label: "Add LinkedIn profile URL",
      done: Boolean(creator?.linkedin_url?.trim()),
      href: "/creator/card",
    },
    {
      id: "publish",
      label: "Publish card to marketplace",
      done: creator?.publication_status === "published",
      href: "/creator/card",
    },
  ];

  let opportunityCounts = {
    pending: 0,
    accepted: 0,
    declined: 0,
  };

  let collabCounts = {
    active: 0,
    completed: 0,
    cancelled: 0,
  };

  let unreadMessages = 0;
  let pendingInvites: PendingOpportunity[] = [];
  let collabs: CollaborationListItem[] = [];
  let inbox: InboxItem[] = [];
  let loadedAtMs = 0;

  if (creator?.id) {
    const [{ data: rows }, { data: pendingRows }, collabList, inboxResult] =
      await Promise.all([
        supabase
          .from("campaign_creators")
          .select("status")
          .eq("creator_id", creator.id),
        supabase
          .from("campaign_creators")
          .select(
            "id,status,campaign_id,price_cents,currency,post_count_snapshot,invited_at",
          )
          .eq("creator_id", creator.id)
          .eq("status", "booking_pending")
          .order("invited_at", { ascending: false })
          .limit(5),
        loadCreatorCollaborationList(creator.id),
        listMessageInbox("creator"),
      ]);

    collabs = collabList.items;
    loadedAtMs = collabList.loadedAtMs;
    inbox = inboxResult.items;

    const pendingCampaignIds = (pendingRows ?? []).map((r) => r.campaign_id);
    const { data: pendingCampaigns } = pendingCampaignIds.length
      ? await supabase
          .from("campaigns")
          .select(
            "id,campaign_name,product_or_company,deliverable_type,target_publish_date,brand_id",
          )
          .in("id", pendingCampaignIds)
      : {
          data: [] as Array<{
            id: string;
            campaign_name: string;
            product_or_company: string;
            deliverable_type: string;
            target_publish_date: string;
            brand_id: string;
          }>,
        };
    const brandIds = Array.from(
      new Set((pendingCampaigns ?? []).map((c) => c.brand_id)),
    );
    const { data: pendingBrands } = brandIds.length
      ? await supabase.from("brands").select("id,company_name").in("id", brandIds)
      : { data: [] as Array<{ id: string; company_name: string }> };
    const campaignById = new Map((pendingCampaigns ?? []).map((c) => [c.id, c]));
    const brandById = new Map((pendingBrands ?? []).map((b) => [b.id, b]));

    pendingInvites = (pendingRows ?? []).map((row) => {
      const campaign = campaignById.get(row.campaign_id);
      return {
        id: row.id,
        campaignName: campaign?.campaign_name ?? "Campaign",
        brandName:
          (campaign && brandById.get(campaign.brand_id)?.company_name) ??
          campaign?.product_or_company ??
          "Brand",
        deliverableType: campaign?.deliverable_type ?? "Deliverable",
        targetPublishDate: campaign?.target_publish_date ?? null,
        priceCents: row.price_cents * row.post_count_snapshot,
        currency: row.currency,
        invitedAt: row.invited_at,
      };
    });

    opportunityCounts = {
      pending: (rows ?? []).filter((i) => i.status === "booking_pending")
        .length,
      accepted: (rows ?? []).filter((i) => i.status === "accepted").length,
      declined: (rows ?? []).filter((i) => i.status === "declined").length,
    };

    collabCounts = {
      active: (rows ?? []).filter((i) =>
        ACTIVE_COLLAB_STATUSES.includes(i.status),
      ).length,
      completed: (rows ?? []).filter((i) => i.status === "completed").length,
      cancelled: (rows ?? []).filter((i) => i.status === "cancelled").length,
    };
  }

  const unread = await countUnreadMessages("creator");
  unreadMessages = unread.count;

  return (
    <CreatorOverview
      profile={profile}
      creator={creator}
      checklist={checklist}
      opportunityCounts={opportunityCounts}
      collabCounts={collabCounts}
      unreadMessages={unreadMessages}
      pendingInvites={pendingInvites}
      collabs={collabs}
      inbox={inbox}
      loadedAtMs={loadedAtMs}
      sharePath={
        creator?.publication_status === "published" && creator.slug
          ? `/brand/creators/${creator.slug}`
          : "/creator/card"
      }
    />
  );
}
