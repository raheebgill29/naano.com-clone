import { CreatorOverview } from "@/components/creator/overview";
import { ACTIVE_COLLAB_STATUSES } from "@/lib/collaborations/queries";
import { countUnreadMessages } from "@/lib/messages/queries";
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

  if (creator?.id) {
    const { data: rows } = await supabase
      .from("campaign_creators")
      .select("status")
      .eq("creator_id", creator.id);

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
      sharePath={
        creator?.publication_status === "published" && creator.slug
          ? `/brand/creators/${creator.slug}`
          : "/creator/card"
      }
    />
  );
}
