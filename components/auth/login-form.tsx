"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  AuthLayout,
  Field,
  FormMessage,
  SubmitButton,
} from "@/components/auth/ui";
import {
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function LoginForm({
  nextPath,
}: {
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your brand or creator workspace."
      footer={
        <>
          No account yet?{" "}
          <Link
            className="font-semibold text-accent hover:text-accent-hover"
            href="/signup"
          >
            Create one
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        {nextPath ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
    </AuthLayout>
  );
}
