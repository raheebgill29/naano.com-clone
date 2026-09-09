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
  completeRoleRecoveryAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { signOutAction } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function RoleRecoveryForm({
  defaultName,
  suggestedRole,
}: {
  defaultName?: string;
  suggestedRole?: "brand" | "creator" | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeRoleRecoveryAction,
    initialState,
  );

  return (
    <AuthLayout
      title="Finish account setup"
      subtitle="Your sign-in worked, but we still need a role on your profile before opening a workspace."
      footer={
        <form action={signOutAction}>
          <button
            type="submit"
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Sign out
          </button>
          {" · "}
          <Link href="/" className="font-semibold text-accent hover:text-accent-hover">
            Home
          </Link>
        </form>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field
          label="Full name"
          name="full_name"
          required
          defaultValue={defaultName ?? ""}
          autoComplete="name"
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">
            I am signing up as <span className="text-danger">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-page/50 p-3.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent">
              <input
                type="radio"
                name="role"
                value="brand"
                required
                defaultChecked={suggestedRole === "brand" || !suggestedRole}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Brand</span>
                <span className="block text-xs text-support">
                  Discover creators and run campaigns
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-page/50 p-3.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent">
              <input
                type="radio"
                name="role"
                value="creator"
                required
                defaultChecked={suggestedRole === "creator"}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Creator</span>
                <span className="block text-xs text-support">
                  Publish a card and review opportunities
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Continue</SubmitButton>
      </form>
    </AuthLayout>
  );
}
