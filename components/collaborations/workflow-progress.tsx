"use client";

import {
  WORKFLOW_STAGES,
  isRevisionLoop,
  workflowStageIndex,
} from "@/lib/collaborations/status";
import type { CampaignCreatorStatus } from "@/lib/supabase/database.types";

export function CollaborationWorkflowProgress({
  status,
}: {
  status: CampaignCreatorStatus;
  compact?: boolean;
}) {
  if (status === "cancelled" || status === "declined") {
    return (
      <p className="text-xs font-semibold text-danger">
        {status === "cancelled" ? "Cancelled" : "Declined"}
      </p>
    );
  }

  if (status === "booking_pending") {
    return (
      <p className="text-xs font-medium text-support">Invite pending</p>
    );
  }

  const current = workflowStageIndex(status);
  const revision = isRevisionLoop(status);

  return (
    <div className="w-full">
      {revision ? (
        <p className="mb-1.5 text-[11px] font-semibold text-warning">
          Revision requested — back at draft
        </p>
      ) : null}
      <ol
        className="flex flex-wrap items-center gap-x-1 gap-y-1.5"
        aria-label="Collaboration progress"
      >
        {WORKFLOW_STAGES.map((stage, index) => {
          const reached = current >= index;
          const isCurrent = current === index;
          return (
            <li key={stage.id} className="flex shrink-0 items-center gap-1">
              {index > 0 ? (
                <span
                  className={`hidden h-px w-2 shrink-0 sm:block ${
                    current >= index ? "bg-accent/50" : "bg-line"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`inline-flex whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${
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
  );
}
