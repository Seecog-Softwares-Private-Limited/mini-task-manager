"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BoardSkeletonProps {
  columns?: number;
  cardsPerColumn?: number[];
  className?: string;
  showToolbar?: boolean;
  showStats?: boolean;
}

export function BoardSkeleton({
  columns = 3,
  cardsPerColumn = [3, 2, 1],
  className,
  showToolbar = true,
  showStats = true,
}: BoardSkeletonProps) {
  return (
    <div className={cn("space-y-5 animate-in fade-in duration-500", className)}>
      {/* Toolbar skeleton */}
      {showToolbar && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      )}

      {/* Stats skeleton */}
      {showStats && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
          <div className="flex-1" />
          <Skeleton className="h-2 w-24 rounded-full" />
        </div>
      )}

      {/* Columns skeleton */}
      <div className="flex w-full gap-4 overflow-hidden">
        {Array.from({ length: columns }).map((_, colIdx) => {
          const cardCount = cardsPerColumn[colIdx % cardsPerColumn.length];
          return (
            <div
              key={colIdx}
              className="min-h-64 min-w-[310px] flex-1 rounded-2xl border bg-muted/10"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <div className="ml-auto">
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2.5 p-3">
                {Array.from({ length: cardCount }).map((_, cardIdx) => (
                  <CardSkeleton key={cardIdx} variant={cardIdx % 3} />
                ))}
              </div>

              {/* Quick add skeleton */}
              <div className="p-3 pt-0">
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardSkeleton({ variant = 0 }: { variant?: number }) {
  return (
    <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
      {/* Task ID */}
      <Skeleton className="h-3 w-10" />
      {/* Title */}
      <Skeleton className={cn("h-4", variant === 0 ? "w-3/4" : variant === 1 ? "w-full" : "w-1/2")} />
      {/* Description */}
      {variant !== 2 && <Skeleton className="h-3 w-full" />}
      {/* Metadata badges */}
      <div className="flex gap-1.5 pt-0.5">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
        {variant === 0 && <Skeleton className="h-5 w-16 rounded-md" />}
      </div>
      {/* Avatar */}
      {variant !== 2 && (
        <div className="flex justify-end">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      )}
    </div>
  );
}
