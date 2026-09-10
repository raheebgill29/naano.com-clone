"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { PasswordField } from "@/components/auth/password-field";
import {
  AuthField,
  AuthLayout,
  AuthSubmitButton,
  AuthTrustLine,
  FormMessage,
} from "@/components/auth/ui";
import {
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { appToast } from "@/lib/toast";

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
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    if (!state.error && !state.success) return;
    const key = `${state.error ?? ""}|${state.success ?? ""}`;
    if (lastToast.current === key) return;
    lastToast.current = key;
    if (state.error) {
      appToast.error({ title: state.error, id: `login:${key}` });
    } else if (state.success) {
      appToast.success({ title: state.success, id: `login:${key}` });
    }
  }, [state]);

  return (
    <AuthLayout
      mode="login"
      title="Welcome back"
      subtitle="Sign in to your brand or creator workspace."
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
      <form action={formAction} className="space-y-5">
        {nextPath ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <AuthField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
        />
        <FormMessage error={state.error} success={state.success} />
        <AuthSubmitButton pending={pending}>Sign in</AuthSubmitButton>
        <AuthTrustLine />
      </form>
    </AuthLayout>
  );
}
