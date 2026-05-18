import { BarChart3 } from "lucide-react";
import LiveRatesSection from "@/components/market/LiveRatesSection";
import LocalMarketInputs from "@/components/market/LocalMarketInputs";
import MortgageCalculator from "@/components/market/MortgageCalculator";
import AffordabilityCheck from "@/components/market/AffordabilityCheck";
import { fetchMortgageRates } from "@/lib/fred";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight relative inline-block">
        <span className="relative">
          {title}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-[3px] w-12 bg-gradient-to-r from-primary to-primary/30 rounded-full"
          />
        </span>
      </h2>
      <p className="text-sm text-muted-foreground max-w-2xl mt-2">{description}</p>
    </div>
  );
}

async function getLiveRate(): Promise<number | null> {
  try {
    const data = await fetchMortgageRates();
    const rate = data?.thirtyYear?.current;
    return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

async function MarketStatsPage() {
  let liveRate: number | null = null;
  try {
    liveRate = await getLiveRate();
  } catch {
    liveRate = null;
  }

  return (
    <div className="relative space-y-12">
      {/* Atmospheric gradient mesh — only visible on this page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full bg-[hsl(38_92%_60%)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[hsl(152_55%_50%)]/10 blur-3xl" />
      </div>

      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Intelligence</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Market Stats
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Live mortgage rates, your local market inputs, and instant
          calculators — everything you need for a credible client conversation.
        </p>
      </header>

      <section className="space-y-5" aria-label="Live mortgage rates">
        <SectionHeader
          eyebrow="Section 1"
          title="Live Mortgage Rates"
          description="Weekly 30-year and 15-year fixed averages, straight from the Federal Reserve."
        />
        <LiveRatesSection />
      </section>

      <section className="space-y-5" aria-label="Local market data">
        <SectionHeader
          eyebrow="Section 2"
          title="Local Market Data"
          description="Update these numbers weekly from your MLS. Saved to this browser."
        />
        <LocalMarketInputs />
      </section>

      <section className="space-y-5" aria-label="Mortgage calculator">
        <SectionHeader
          eyebrow="Section 3"
          title="Mortgage Calculator"
          description="Pre-filled with the current 30-year rate. Numbers update as you type."
        />
        <MortgageCalculator prefillRate={liveRate} />
      </section>

      <section className="space-y-5" aria-label="Affordability check">
        <SectionHeader
          eyebrow="Section 4"
          title="Affordability Quick Check"
          description="Standard 28% DTI rule — useful as a first-pass screening tool."
        />
        <AffordabilityCheck currentRate={liveRate} />
      </section>
    </div>
  );
}

export default MarketStatsPage;
