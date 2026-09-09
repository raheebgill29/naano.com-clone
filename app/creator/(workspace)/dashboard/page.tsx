import { CreatorOverview } from "@/components/creator/overview";
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

  if (creator?.id) {
    const { data: invites } = await supabase
      .from("campaign_creators")
      .select("status")
      .eq("creator_id", creator.id)
      .in("status", ["booking_pending", "accepted", "declined"]);

    opportunityCounts = {
      pending: (invites ?? []).filter((i) => i.status === "booking_pending")
        .length,
      accepted: (invites ?? []).filter((i) => i.status === "accepted").length,
      declined: (invites ?? []).filter((i) => i.status === "declined").length,
    };
  }

  return (
    <CreatorOverview
      profile={profile}
      creator={creator}
      checklist={checklist}
      opportunityCounts={opportunityCounts}
      sharePath={
        creator?.publication_status === "published" && creator.slug
          ? `/brand/creators/${creator.slug}`
          : "/creator/card"
      }
    />
  );
}
