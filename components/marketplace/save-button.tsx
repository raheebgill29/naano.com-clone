"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveCreator, unsaveCreator } from "@/lib/marketplace/actions";

export function SaveCreatorButton({
  creatorId,
  initiallySaved,
}: {
  creatorId: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = saved
        ? await unsaveCreator(creatorId)
        : await saveCreator(creatorId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(!saved);
      setMessage(result.success ?? null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? "border border-line-strong bg-surface text-ink hover:bg-[#f7f8fa]"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        {pending ? "Saving…" : saved ? "Remove saved" : "Save creator"}
      </button>
      {message ? (
        <p className="text-xs text-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-danger" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
