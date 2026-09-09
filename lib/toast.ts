import { toast as sonner } from "sonner";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  title: string;
  description?: string;
  action?: ToastAction;
  /** Stable id prevents duplicate toasts from rerenders / retries */
  id?: string;
};

const DURATION = {
  success: 4000,
  info: 6500,
  warning: 7500,
  error: 12_000,
  loading: Infinity,
} as const;

function toastId(
  kind: string,
  title: string,
  description?: string,
  explicit?: string,
) {
  if (explicit) return explicit;
  return `${kind}:${title}:${description ?? ""}`;
}

function options(
  kind: keyof typeof DURATION,
  input: ToastInput,
): Parameters<typeof sonner>[1] {
  return {
    id: toastId(kind, input.title, input.description, input.id),
    description: input.description,
    duration: DURATION[kind],
    action: input.action
      ? {
          label: input.action.label,
          onClick: input.action.onClick,
        }
      : undefined,
  };
}

/** Map raw Supabase / Postgres / network strings into concise user copy. */
export function humanizeError(raw: string | null | undefined): string {
  const message = (raw ?? "").trim();
  if (!message) return "Something went wrong. Please try again.";

  const lower = message.toLowerCase();

  if (
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("invalid login") ||
    lower.includes("invalid credentials")
  ) {
    return "Sign in failed. Check your email and password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("42501") ||
    lower.includes("not your")
  ) {
    return "You don’t have permission to do that.";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "That record already exists.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("timeout")) {
    return "The request timed out. Please try again.";
  }

  // Strip common Postgres / PostgREST prefixes
  const cleaned = message
    .replace(/^error:\s*/i, "")
    .replace(/^p0001:\s*/i, "")
    .replace(/^postgrest\s*/i, "")
    .trim();

  if (cleaned.length > 160) {
    return `${cleaned.slice(0, 157)}…`;
  }
  return cleaned;
}

export const appToast = {
  success(input: ToastInput | string) {
    const payload = typeof input === "string" ? { title: input } : input;
    return sonner.success(payload.title, options("success", payload));
  },
  error(input: ToastInput | string) {
    const payload =
      typeof input === "string"
        ? { title: humanizeError(input) }
        : {
            ...input,
            title: humanizeError(input.title),
            description: input.description
              ? humanizeError(input.description)
              : undefined,
          };
    return sonner.error(payload.title, options("error", payload));
  },
  warning(input: ToastInput | string) {
    const payload = typeof input === "string" ? { title: input } : input;
    return sonner.warning(payload.title, options("warning", payload));
  },
  info(input: ToastInput | string) {
    const payload = typeof input === "string" ? { title: input } : input;
    return sonner.info(payload.title, options("info", payload));
  },
  loading(input: ToastInput | string) {
    const payload = typeof input === "string" ? { title: input } : input;
    return sonner.loading(payload.title, {
      ...options("loading", payload),
      duration: Infinity,
    });
  },
  dismiss(id?: string | number) {
    sonner.dismiss(id);
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((err: unknown) => string);
      id?: string;
    },
  ) {
    return sonner.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) => {
        const raw =
          typeof messages.error === "function"
            ? messages.error(err)
            : messages.error;
        return humanizeError(
          raw || (err instanceof Error ? err.message : String(err)),
        );
      },
      id: messages.id,
      duration: DURATION.success,
    });
  },
};

/** Known URL `?error=` / `?success=` codes → toast copy */
export const URL_FLASH_MESSAGES: Record<
  string,
  { type: "success" | "error" | "warning" | "info"; title: string; description?: string }
> = {
  auth: {
    type: "error",
    title: "Sign-in failed",
    description: "Authentication did not complete. Please try again.",
  },
  profile_missing: {
    type: "warning",
    title: "Account setup needed",
    description: "Your account needs a quick role setup. Sign in again to continue.",
  },
  "missing-campaign": {
    type: "error",
    title: "Campaign not found",
    description: "That campaign is missing or no longer available.",
  },
  "brand-missing": {
    type: "warning",
    title: "Brand profile required",
    description: "Complete brand onboarding before continuing.",
  },
};
