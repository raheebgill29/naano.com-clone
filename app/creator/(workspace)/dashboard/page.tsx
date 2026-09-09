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

  return (
    <CreatorOverview
      profile={profile}
      creator={creator}
      checklist={checklist}
      sharePath={
        creator?.publication_status === "published" && creator.slug
          ? `/brand/creators/${creator.slug}`
          : "/creator/card"
      }
    />
  );
}
