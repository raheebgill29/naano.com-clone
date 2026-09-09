import { BrandOnboardingForm } from "@/components/onboarding/brand-form";
import { requireOnboarding } from "@/lib/auth/session";

export default async function BrandOnboardingPage() {
  const { profile } = await requireOnboarding("brand");
  return <BrandOnboardingForm fullName={profile.full_name} />;
}
