"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  AuthShell,
  Field,
  FormMessage,
  SubmitButton,
} from "@/components/auth/ui";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <AuthShell
      title="Create account"
      subtitle="Choose Brand or Creator. Role cannot be changed later."
    >
      <form action={formAction} className="space-y-4">
        <Field label="Full name" name="full_name" required />
        <Field label="Email" name="email" type="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          placeholder="At least 8 characters"
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-800">Role</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="radio" name="role" value="brand" required />
            Brand
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="radio" name="role" value="creator" required />
            Creator
          </label>
        </fieldset>
        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link className="font-medium text-zinc-900 underline" href="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
