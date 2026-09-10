import { CampaignsListSkeleton } from "@/components/campaigns/campaigns-workspace";

export default function CampaignsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-page" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-page" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-10 w-28 animate-pulse rounded-[12px] bg-page"
          />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-[14px] border border-line bg-surface" />
      <CampaignsListSkeleton />
    </div>
  );
}
