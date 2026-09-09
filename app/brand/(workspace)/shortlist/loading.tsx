import Link from "next/link";

import { ShortlistGridSkeleton } from "@/components/marketplace/shortlist-workspace";

export default function ShortlistLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-page" />
          <div className="h-8 w-48 animate-pulse rounded bg-page" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-page" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-[12px] bg-page" />
      </div>
      <div className="h-16 animate-pulse rounded-[14px] border border-line bg-surface" />
      <ShortlistGridSkeleton />
      <p className="sr-only">
        Loading shortlist…{" "}
        <Link href="/brand/shortlist">Retry</Link>
      </p>
    </div>
  );
}
