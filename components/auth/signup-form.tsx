"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { PasswordField } from "@/components/auth/password-field";
import {
  AuthField,
  AuthLayout,
  AuthSubmitButton,
  AuthTrustLine,
  FormMessage,
} from "@/components/auth/ui";
import {
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { appToast } from "@/lib/toast";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );
  const [role, setRole] = useState<"brand" | "creator" | "">("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    if (!state.error && !state.success) return;
    const key = `${state.error ?? ""}|${state.success ?? ""}`;
    if (lastToast.current === key) return;
    lastToast.current = key;
    if (state.error) {
      appToast.error({ title: state.error, id: `signup:${key}` });
    } else if (state.success) {
      appToast.success({ title: state.success, id: `signup:${key}` });
    }
  }, [state]);

  return (
    <AuthLayout
      mode="signup"
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
      <form
        action={formAction}
        className="space-y-4 sm:space-y-5"
        onSubmit={(event) => {
          const form = event.currentTarget;
          const password = new FormData(form).get("password");
          const value = typeof password === "string" ? password : "";
          if (value.length > 0 && value.length < 8) {
            event.preventDefault();
            setPasswordError("Use at least 8 characters.");
            return;
          }
          setPasswordError(undefined);
          if (!role) {
            event.preventDefault();
            appToast.error({
              title: "Choose Brand or Creator to continue.",
              id: "signup-role",
            });
          }
        }}
      >
        <AuthField
          label="Full name"
          name="full_name"
          required
          autoComplete="name"
          placeholder="Alex Rivera"
        />
        <AuthField
          label="Work email"
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use at least 8 characters."
          minLength={8}
          error={passwordError}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">
            I am signing up as <span className="text-danger"> *</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <RoleOption
              value="brand"
              title="Brand"
              description="Discover creators and run LinkedIn campaigns."
              selected={role === "brand"}
              onSelect={() => setRole("brand")}
              icon={<BrandIcon />}
            />
            <RoleOption
              value="creator"
              title="Creator"
              description="Publish a priced LinkedIn creator card."
              selected={role === "creator"}
              onSelect={() => setRole("creator")}
              icon={<CreatorIcon />}
            />
          </div>
        </fieldset>

        <FormMessage error={state.error} success={state.success} />
        <AuthSubmitButton pending={pending}>Create account</AuthSubmitButton>
        <AuthTrustLine />
      </form>
    </AuthLayout>
  );
}

function RoleOption({
  value,
  title,
  description,
  selected,
  onSelect,
  icon,
}: {
  value: "brand" | "creator";
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
}) {
  return (
    <label
      className={`relative flex h-full cursor-pointer flex-col gap-3 rounded-[16px] border p-4 transition-[border-color,background-color,box-shadow,transform] duration-150 has-[:focus-visible]:shadow-[var(--focus)] sm:min-h-[9.5rem] ${
        selected
          ? "border-accent bg-accent-soft shadow-[0_4px_14px_rgb(29_78_216/12%)]"
          : "border-line bg-surface hover:border-line-strong hover:bg-page hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <input
        type="radio"
        name="role"
        value={value}
        required
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${
            selected ? "bg-accent text-white" : "bg-page text-accent"
          }`}
          aria-hidden
        >
          {icon}
        </span>
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
            selected
              ? "border-accent bg-accent text-white"
              : "border-line-strong bg-surface text-transparent"
          }`}
          aria-hidden
        >
          ✓
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold text-ink">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

function BrandIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01M15 10h.01" />
    </svg>
  );
}

function CreatorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
      <path d="M16 3.5 17.5 5 20 2.5" />
    </svg>
  );
}
