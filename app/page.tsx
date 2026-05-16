import StatsGrid from '@/components/dashboard/StatsGrid';
import RecentComparisons from '@/components/dashboard/RecentComparisons';
import QuickAddToPipeline from '@/components/dashboard/QuickAddToPipeline';

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.58_0.11_235)]" />
          <span>Dashboard · {today}</span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
          Good morning. Here&rsquo;s your desk.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A live snapshot of your pipeline, recent property comparisons, and the rate environment
          your buyers are negotiating against right now.
        </p>
      </header>

      <section aria-label="Key metrics">
        <StatsGrid />
      </section>

      <section
        aria-label="Recent comparisons"
        className="grid gap-8 lg:grid-cols-[1.6fr_1fr]"
      >
        <RecentComparisons />
        <QuickAddToPipeline />
      </section>
    </div>
  );
}
