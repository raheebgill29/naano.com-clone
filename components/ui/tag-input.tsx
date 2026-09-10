"use client";

import {
  useId,
  useState,
  type KeyboardEvent,
} from "react";

type TagInputProps = {
  id?: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({
  id,
  label,
  required,
  hint,
  placeholder,
  tags,
  onChange,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const fieldId = id ?? inputId;

  function commit(raw: string) {
    const parts = raw
      .split(/[,]/g)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...tags];
    for (const part of parts) {
      const exists = next.some(
        (tag) => tag.toLowerCase() === part.toLowerCase(),
      );
      if (!exists) next.push(part);
    }
    onChange(next);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-[12px] border border-line bg-surface px-2.5 py-2 focus-within:border-accent">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-[8px] bg-page px-2 py-1 text-xs font-semibold text-ink"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="text-ink-subtle hover:text-ink"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={fieldId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          placeholder={tags.length ? undefined : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>
      {hint ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function tagsToCsv(tags: string[]) {
  return tags.join(", ");
}
