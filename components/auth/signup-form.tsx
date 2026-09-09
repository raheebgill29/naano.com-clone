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
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Choose Brand or Creator. Your role is fixed after sign-up."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-semibold text-accent hover:text-accent-hover"
            href="/login"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field
          label="Full name"
          name="full_name"
          required
          autoComplete="name"
        />
        <Field
          label="Work email"
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use at least 8 characters."
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">
            I am signing up as <span className="text-danger">*</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative flex cursor-pointer flex-col rounded-lg border border-line bg-page/50 p-3.5 transition has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:focus-visible]:shadow-[var(--focus)]">
              <input
                type="radio"
                name="role"
                value="brand"
                required
                className="sr-only"
              />
              <span className="text-sm font-semibold text-ink">Brand</span>
              <span className="mt-1 text-xs leading-5 text-ink-muted">
                Discover creators and run campaigns
              </span>
            </label>
            <label className="relative flex cursor-pointer flex-col rounded-lg border border-line bg-page/50 p-3.5 transition has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:focus-visible]:shadow-[var(--focus)]">
              <input
                type="radio"
                name="role"
                value="creator"
                required
                className="sr-only"
              />
              <span className="text-sm font-semibold text-ink">Creator</span>
              <span className="mt-1 text-xs leading-5 text-ink-muted">
                Publish a priced LinkedIn profile
              </span>
            </label>
          </div>
        </fieldset>

        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
