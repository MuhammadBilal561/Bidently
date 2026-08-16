/**
 * Reusable loading placeholders — skeletons shaped like the content they'll
 * become, per the design upgrade (a skeleton compliance-matrix row, not a
 * generic spinner). Uses Tailwind's built-in `animate-pulse`.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-line ${className}`} />;
}

/** Shimmering compliance-matrix rows shown while extraction runs. */
export function MatrixSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-line bg-surface p-4 space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Small skeleton shown inside a requirement row while a draft generates. */
export function DraftSkeleton() {
  return (
    <div
      className="mt-2.5 rounded-md border border-slate-line bg-paper px-3.5 py-3 space-y-2"
      aria-hidden="true"
    >
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
      <div className="pt-1">
        <Skeleton className="h-4 w-32 rounded-full" />
      </div>
    </div>
  );
}