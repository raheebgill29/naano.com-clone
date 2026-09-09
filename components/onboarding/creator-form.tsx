"use client";

import { useActionState } from "react";

import { Field, FormMessage, SubmitButton, TextArea } from "@/components/auth/ui";
import { OnboardingLayout } from "@/components/onboarding/shell";
import {
  completeCreatorOnboarding,
  type OnboardingActionState,
} from "@/lib/auth/onboarding";

const initialState: OnboardingActionState = {};

export function CreatorOnboardingForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    completeCreatorOnboarding,
    initialState,
  );

  return (
    <OnboardingLayout
      step={2}
      totalSteps={2}
      stepLabel="Creator profile"
      title="Set up your creator profile"
      subtitle={`Welcome, ${fullName}. Brands will use this profile for discovery and booking.`}
    >
      <form action={formAction} className="space-y-5">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Positioning
          </p>
          <Field
            label="Headline"
            name="headline"
            required
            placeholder="B2B SaaS creator"
          />
          <TextArea
            label="Bio"
            name="bio"
            rows={3}
            placeholder="What you write about and who trusts your recommendations."
          />
          <Field
            label="Topics"
            name="topics"
            placeholder="saas, marketing, ai"
            hint="Comma-separated topics used for discovery filters."
          />
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Audience & pricing
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Audience size"
              name="audience_size"
              type="number"
              required
              min={0}
              hint="Estimated followers / reach."
            />
            <Field
              label="Price per post (cents)"
              name="price_cents"
              type="number"
              required
              min={0}
              step={1}
              placeholder="50000"
              hint="Example: 50000 = $500.00"
            />
          </div>
          <Field
            label="Audience summary"
            name="audience_summary"
            placeholder="B2B marketers, US/EU"
          />
          <Field
            label="LinkedIn URL"
            name="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Save and continue</SubmitButton>
      </form>
    </OnboardingLayout>
  );
}
