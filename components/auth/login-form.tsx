"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  AuthShell,
  Field,
  FormMessage,
  SubmitButton,
} from "@/components/auth/ui";

const initialState: AuthActionState = {};

export function LoginForm({
  nextPath,
  authError,
}: {
  nextPath?: string;
  authError?: string;
}) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your brand or creator workspace."
    >
      <form action={formAction} className="space-y-4">
        {nextPath ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <FormMessage
          error={state.error ?? authError}
          success={state.success}
        />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-zinc-600">
        No account yet?{" "}
        <Link className="font-medium text-zinc-900 underline" href="/signup">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
