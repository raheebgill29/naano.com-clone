import { MarketplaceCardSkeleton } from "@/components/marketplace/marketplace-card";

export default function DiscoverLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-page" />
        <div className="h-8 w-56 animate-pulse rounded bg-page" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-page" />
      </div>
      <div className="h-16 animate-pulse rounded-[14px] border border-line bg-surface" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index}>
            <MarketplaceCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
