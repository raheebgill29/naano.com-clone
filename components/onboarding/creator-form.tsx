"use client";

import { useActionState } from "react";

import {
  completeCreatorOnboarding,
  type OnboardingActionState,
} from "@/lib/auth/onboarding";
import {
  AuthShell,
  Field,
  FormMessage,
  SubmitButton,
} from "@/components/auth/ui";

const initialState: OnboardingActionState = {};

export function CreatorOnboardingForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    completeCreatorOnboarding,
    initialState,
  );

  return (
    <AuthShell
      title="Creator onboarding"
      subtitle={`Welcome, ${fullName}. Set up your LinkedIn creator profile.`}
    >
      <form action={formAction} className="space-y-4">
        <Field
          label="Headline"
          name="headline"
          required
          placeholder="B2B SaaS creator"
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800">Bio</span>
          <textarea
            name="bio"
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
        </label>
        <Field
          label="Topics (comma-separated)"
          name="topics"
          placeholder="saas, marketing, ai"
        />
        <Field
          label="Audience size"
          name="audience_size"
          type="number"
          required
          min={0}
        />
        <Field
          label="Audience summary"
          name="audience_summary"
          placeholder="B2B marketers, US/EU"
        />
        <Field
          label="Price per post (cents)"
          name="price_cents"
          type="number"
          required
          min={0}
          step={1}
          placeholder="50000 = $500"
        />
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
          placeholder="https://linkedin.com/in/..."
        />
        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Save and continue</SubmitButton>
      </form>
    </AuthShell>
  );
}
