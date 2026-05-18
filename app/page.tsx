import StatsGrid from '@/components/dashboard/StatsGrid';
import RecentComparisons from '@/components/dashboard/RecentComparisons';
import QuickAddToPipeline from '@/components/dashboard/QuickAddToPipeline';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative space-y-12">
      {/* Atmospheric gradient mesh — anchors the dashboard with depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-[hsl(201_58%_43%/0.08)] blur-3xl" />
        <div className="absolute top-40 -right-32 h-[420px] w-[420px] rounded-full bg-[hsl(220_38%_14%/0.06)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[hsl(201_58%_43%/0.05)] blur-3xl" />
      </div>

      <header className="relative flex flex-col gap-3 border-b border-border pb-10">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono">Dashboard</span>
          <span className="text-border">/</span>
          <span>{today}</span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
          Good morning.
          <br />
          <span className="text-muted-foreground">Here&rsquo;s your desk.</span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A live snapshot of your pipeline, recent property comparisons, and the rate environment
          your buyers are negotiating against right now.
        </p>
      </header>

      <section aria-label="Key metrics" className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            01 — Metrics
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <StatsGrid />
      </section>

      <section aria-label="Recent activity" className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            02 — Activity
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <RecentComparisons />
          <QuickAddToPipeline />
        </div>
      </section>
    </div>
  );
}
