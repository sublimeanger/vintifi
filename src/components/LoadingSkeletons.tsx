import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Generic shimmer card skeleton */
function ShimmerCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <Card className={`p-4 space-y-3 skeleton-shimmer ${className}`}>{children}</Card>;
}

/** Trend Radar style skeleton */
export function TrendCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Listing card skeleton */
export function ListingCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Competitor card skeleton */
export function CompetitorCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="flex gap-4 pt-1">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-10" />
            </div>
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Analytics / Chart area skeleton */
export function ChartSkeleton() {
  return (
    <ShimmerCard className="h-64">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex items-end gap-2 h-40 pt-4">
        {[40, 65, 50, 80, 55, 70, 45, 75, 60, 85, 50, 65].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </ShimmerCard>
  );
}

/** KPI metrics grid skeleton */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Schedule / relist card skeleton */
export function ScheduleCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Arbitrage opportunity card skeleton */
export function ArbitrageCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-start gap-3">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Briefing item skeleton */
export function BriefingCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <div className="flex gap-6">
            <div className="space-y-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
        </ShimmerCard>
      ))}
    </div>
  );
}

/** Price check result skeleton */
export function PriceReportSkeleton() {
  return (
    <div className="space-y-2.5 sm:space-y-4">
      <ShimmerCard className="!p-3 sm:!p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 sm:w-28" />
            <Skeleton className="h-8 w-20 sm:h-10 sm:w-24" />
          </div>
          <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
        </div>
      </ShimmerCard>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {[1, 2, 3].map((i) => (
          <ShimmerCard key={i} className="!p-2.5 sm:!p-4">
            <Skeleton className="h-2.5 w-14 sm:w-20" />
            <Skeleton className="h-5 w-12 sm:h-6 sm:w-16" />
          </ShimmerCard>
        ))}
      </div>
      <ChartSkeleton />
      <ShimmerCard className="!p-3 sm:!p-4">
        <Skeleton className="h-3.5 w-32 sm:w-40 mb-2" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-36 sm:w-48" />
              <Skeleton className="h-3.5 w-12 sm:w-16" />
            </div>
          ))}
        </div>
      </ShimmerCard>
    </div>
  );
}

/** Portfolio / Dead Stock recommendation skeleton */
export function RecommendationCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
        </ShimmerCard>
      ))}
    </div>
  );
}
