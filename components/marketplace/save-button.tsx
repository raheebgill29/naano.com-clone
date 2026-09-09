"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";

import { saveCreator, unsaveCreator } from "@/lib/marketplace/actions";
import { appToast } from "@/lib/toast";

export function SaveCreatorButton({
  creatorId,
  initiallySaved,
  variant = "button",
}: {
  creatorId: string;
  initiallySaved: boolean;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  function onToggle(event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    startTransition(async () => {
      const result = saved
        ? await unsaveCreator(creatorId)
        : await saveCreator(creatorId);
      if (result.error) {
        appToast.error({
          title: result.error,
          id: `save-creator:${creatorId}:error`,
        });
        return;
      }
      setSaved(!saved);
      if (result.success) {
        appToast.success({
          title: result.success,
          id: `save-creator:${creatorId}:${result.success}`,
        });
      }
      router.refresh();
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
        title={saved ? "Saved to shortlist" : "Save to shortlist"}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-[background-color,border-color,color] duration-150 disabled:opacity-60 ${
          saved
            ? "border-accent/30 bg-accent-soft text-accent"
            : "border-line bg-surface text-ink-subtle hover:border-line-strong hover:bg-page hover:text-ink"
        }`}
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        >
          <path
            d="M12 20s-6.5-4.1-6.5-9.1A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 6.5 2.7C18.5 15.9 12 20 12 20Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">
          {saved ? "Saved" : "Not saved"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={saved}
      className={`inline-flex items-center justify-center rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors duration-150 disabled:opacity-60 ${
        saved
          ? "border border-line-strong bg-surface text-ink hover:bg-page"
          : "bg-accent text-white hover:bg-accent-hover"
      }`}
    >
      {pending ? "Saving…" : saved ? "Remove from shortlist" : "Save creator"}
    </button>
  );
}
