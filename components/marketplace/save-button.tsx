"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveCreator, unsaveCreator } from "@/lib/marketplace/actions";
import { appToast } from "@/lib/toast";

export function SaveCreatorButton({
  creatorId,
  initiallySaved,
}: {
  creatorId: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  function onToggle() {
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

  return (
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
  );
}
