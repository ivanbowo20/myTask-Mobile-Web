export default function DashboardSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse select-none"
      role="status"
      aria-label="Memuat konten..."
      aria-busy="true"
    >
      {/* Header Skeleton */}
      <div className="border-b border-white/[0.08] pb-5 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.08]" />
          <div className="h-7 w-44 sm:w-56 rounded-lg bg-white/[0.08]" />
          <div className="h-5 w-20 rounded-full bg-white/[0.06] border border-white/[0.08]" />
        </div>
        <div className="h-4 w-64 sm:w-80 rounded bg-white/[0.04]" />
      </div>

      {/* Tabs / Filter Pill Bar Skeleton */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] w-full sm:w-fit overflow-hidden">
        <div className="h-9 w-24 rounded-lg bg-white/[0.08]" />
        <div className="h-9 w-24 rounded-lg bg-white/[0.04]" />
        <div className="h-9 w-24 rounded-lg bg-white/[0.04]" />
        <div className="h-9 w-20 rounded-lg bg-white/[0.04]" />
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col md:flex-row items-center gap-3">
        <div className="h-10 w-full flex-1 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
        <div className="h-10 w-full md:w-56 shrink-0 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
      </div>

      {/* Grid of Task Cards Skeleton (6 items) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.08] space-y-4"
          >
            {/* Top row: checkbox placeholder + title skeleton */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/[0.08] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-4/5 rounded bg-white/[0.08]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
              <div className="w-5 h-5 rounded bg-white/[0.05] shrink-0" />
            </div>

            {/* Bottom row: deadline tag and category tag */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <div className="h-5 w-24 rounded-full bg-white/[0.06]" />
              <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
