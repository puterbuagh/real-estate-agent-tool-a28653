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
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
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
    <div className="space-y-10">
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

      <section className="space-y-4" aria-label="Live mortgage rates">
        <SectionHeader
          eyebrow="Section 1"
          title="Live Mortgage Rates"
          description="Weekly 30-year and 15-year fixed averages, straight from the Federal Reserve."
        />
        <LiveRatesSection />
      </section>

      <section className="space-y-4" aria-label="Local market data">
        <SectionHeader
          eyebrow="Section 2"
          title="Local Market Data"
          description="Update these numbers weekly from your MLS. Saved to this browser."
        />
        <LocalMarketInputs />
      </section>

      <section className="space-y-4" aria-label="Mortgage calculator">
        <SectionHeader
          eyebrow="Section 3"
          title="Mortgage Calculator"
          description="Pre-filled with the current 30-year rate. Numbers update as you type."
        />
        <MortgageCalculator prefillRate={liveRate} />
      </section>

      <section className="space-y-4" aria-label="Affordability check">
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
