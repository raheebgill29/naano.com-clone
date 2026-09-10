import { CollaborationsListSkeleton } from "@/components/collaborations/collaborations-workspace";

export default function CollaborationsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-56 max-w-full animate-pulse rounded bg-page" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-page" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[4.5rem] animate-pulse rounded-[14px] border border-line bg-surface"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-10 w-32 animate-pulse rounded-[12px] bg-page"
          />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-[14px] border border-line bg-surface" />
      <CollaborationsListSkeleton />
    </div>
  );
}
