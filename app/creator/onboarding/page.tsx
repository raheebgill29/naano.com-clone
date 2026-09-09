import { CreatorOnboardingForm } from "@/components/onboarding/creator-form";
import { requireOnboarding } from "@/lib/auth/session";

export default async function CreatorOnboardingPage() {
  const { profile } = await requireOnboarding("creator");
  return <CreatorOnboardingForm fullName={profile.full_name} />;
}
