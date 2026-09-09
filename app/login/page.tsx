import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const authError =
    params.error === "profile_missing"
      ? "Your account needs a quick role setup. Sign in again to continue."
      : params.error === "auth"
        ? "Authentication failed. Please sign in again."
        : undefined;

  return (
    <LoginForm
      nextPath={params.next}
      authError={authError}
    />
  );
}
