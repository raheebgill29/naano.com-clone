"use client";

import { useActionState } from "react";

import {
  completeBrandOnboarding,
  type OnboardingActionState,
} from "@/lib/auth/onboarding";
import {
  AuthShell,
  Field,
  FormMessage,
  SubmitButton,
} from "@/components/auth/ui";

const initialState: OnboardingActionState = {};

export function BrandOnboardingForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    completeBrandOnboarding,
    initialState,
  );

  return (
    <AuthShell
      title="Brand onboarding"
      subtitle={`Welcome, ${fullName}. Tell us about your company.`}
    >
      <form action={formAction} className="space-y-4">
        <Field label="Company name" name="company_name" required />
        <Field
          label="Website"
          name="website"
          type="url"
          placeholder="https://"
        />
        <Field label="Industry" name="industry" />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800">Description</span>
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
        </label>
        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Save and continue</SubmitButton>
      </form>
    </AuthShell>
  );
}
