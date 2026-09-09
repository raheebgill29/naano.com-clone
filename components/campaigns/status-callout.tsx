import {
  CAMPAIGN_STATUS_EXPLANATION,
  CAMPAIGN_STATUS_LABEL,
  campaignStatusBadgeClass,
} from "@/lib/campaigns/status";
import type { CampaignStatus } from "@/lib/supabase/database.types";

export function CampaignStatusCallout({ status }: { status: CampaignStatus }) {
  return (
    <div className="rounded-lg border border-line bg-[#f7f8fa] px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-subtle">Campaign</span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(status)}`}
        >
          {CAMPAIGN_STATUS_LABEL[status]}
        </span>
      </div>
      <p className="mt-1 text-support">{CAMPAIGN_STATUS_EXPLANATION[status]}</p>
    </div>
  );
}
