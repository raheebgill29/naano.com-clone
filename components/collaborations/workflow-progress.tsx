"use client";

import {
  WORKFLOW_STAGES,
  isRevisionLoop,
  workflowStageIndex,
} from "@/lib/collaborations/status";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

export function CollaborationWorkflowProgress({
  status,
  updatedAt,
  size = "default",
}: {
  status: CampaignCreatorStatus;
  updatedAt?: string | null;
  /** @deprecated unused — kept for call-site compatibility */
  compact?: boolean;
  size?: "default" | "detail";
}) {
  if (status === "cancelled" || status === "declined") {
    return (
      <div>
        <p
          className={`font-semibold text-danger ${size === "detail" ? "text-sm" : "text-xs"}`}
        >
          {status === "cancelled" ? "Cancelled" : "Declined"}
        </p>
        {updatedAt ? (
          <p className="mt-1 text-[11px] text-ink-subtle">
            Updated {formatStamp(updatedAt)}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === "booking_pending") {
    return (
      <p className="text-xs font-medium text-support">Invite pending</p>
    );
  }

  const current = workflowStageIndex(status);
  const revision = isRevisionLoop(status);
  const pill =
    size === "detail"
      ? "px-2 py-1 text-[11px]"
      : "px-1.5 py-0.5 text-[10px]";

  return (
    <div className="w-full min-w-0">
      {revision ? (
        <p className="mb-1.5 text-[11px] font-semibold text-warning">
          Revision requested — back at draft
        </p>
      ) : null}
      <div className="-mx-1 overflow-x-auto px-1">
        <ol
          className="flex min-w-max items-center gap-x-1 gap-y-1.5"
          aria-label="Collaboration progress"
        >
          {WORKFLOW_STAGES.map((stage, index) => {
            const reached = current >= index;
            const isCurrent = current === index;
            return (
              <li key={stage.id} className="flex shrink-0 items-center gap-1">
                {index > 0 ? (
                  <span
                    className={`h-px w-2 shrink-0 sm:w-3 ${
                      current >= index ? "bg-accent/50" : "bg-line"
                    }`}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`inline-flex whitespace-nowrap rounded-[6px] font-semibold leading-tight ${pill} ${
                    isCurrent
                      ? revision && index === 1
                        ? "bg-warning-soft text-warning"
                        : "bg-accent text-white"
                      : reached
                        ? "bg-accent-soft text-accent"
                        : "bg-page text-ink-subtle"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {updatedAt ? (
        <p className="mt-2 text-[11px] text-ink-subtle">
          Status updated {formatStamp(updatedAt)}
        </p>
      ) : null}
    </div>
  );
}

function formatStamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
