"use client";

import { useActionState } from "react";

import { Field, FormMessage, SubmitButton, TextArea } from "@/components/auth/ui";
import { OnboardingLayout } from "@/components/onboarding/shell";
import {
  completeBrandOnboarding,
  type OnboardingActionState,
} from "@/lib/auth/onboarding";

const initialState: OnboardingActionState = {};

export function BrandOnboardingForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(
    completeBrandOnboarding,
    initialState,
  );

  return (
    <OnboardingLayout
      step={2}
      totalSteps={2}
      stepLabel="Company profile"
      title="Set up your brand"
      subtitle={`Welcome, ${fullName}. Add the company details brands will use across campaigns.`}
    >
      <form action={formAction} className="space-y-5">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Company
          </p>
          <Field label="Company name" name="company_name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Website"
              name="website"
              type="url"
              placeholder="https://"
            />
            <Field
              label="Industry"
              name="industry"
              placeholder="SaaS, fintech, etc."
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Positioning
          </p>
          <TextArea
            label="Description"
            name="description"
            rows={4}
            placeholder="What does your company do, and who do you sell to?"
            hint="Optional — helps creators understand your brand."
          />
        </div>

        <FormMessage error={state.error} success={state.success} />
        <SubmitButton pending={pending}>Save and continue</SubmitButton>
      </form>
    </OnboardingLayout>
  );
}
