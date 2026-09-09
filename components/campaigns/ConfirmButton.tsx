"use client";

import type { ReactNode } from "react";

export function ConfirmButton({
  confirmText,
  children,
  disabled,
}: {
  confirmText: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        const ok = window.confirm(confirmText);
        if (!ok) e.preventDefault();
      }}
      className="inline-flex w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f8fa] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

