import type {
  FredResponse,
  MortgageRateResult,
  RatePoint,
  RateSeries,
  MortgageRatesPayload,
} from "@/types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

function getApiKey(): string | null {
  const apiKey = process.env.NEXT_PUBLIC_FRED_API_KEY;
  if (!apiKey) return null;
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().includes("your-")) return null;
  if (trimmed.toLowerCase().includes("placeholder")) return null;
  return trimmed;
}

function emptySeries(): RateSeries {
  return {
    current: 0,
    currentDate: new Date().toISOString().slice(0, 10),
    history: [],
  };
}

/**
 * Fetch the N most recent observations for any FRED series.
 * Returns an empty array (never throws) when the API key is missing or the
 * request fails, so callers in server components / route handlers degrade
 * gracefully during prerender.
 */
export async function fetchFredSeries(
  seriesId: string,
  limit = 12
): Promise<RatePoint[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as FredResponse;
    const observations = data?.observations ?? [];

    const points: RatePoint[] = observations
      .filter((o) => o.value && o.value !== ".")
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((p) => Number.isFinite(p.value))
      .reverse();

    return points;
  } catch {
    return [];
  }
}

function toRateSeries(points: RatePoint[]): RateSeries {
  if (!points || points.length === 0) return emptySeries();
  const latest = points[points.length - 1];
  return {
    current: latest.value,
    currentDate: latest.date,
    history: points,
  };
}

/**
 * Fetch MORTGAGE30US and MORTGAGE15US, each with 12 weeks of history.
 * Always resolves — returns empty series when the key is missing or upstream
 * fails, so server components never throw during build.
 */
export async function fetchMortgageRates(): Promise<MortgageRatesPayload> {
  const [thirty, fifteen] = await Promise.all([
    fetchFredSeries("MORTGAGE30US", 12),
    fetchFredSeries("MORTGAGE15US", 12),
  ]);

  const thirtyYear = toRateSeries(thirty);
  const fifteenYear = toRateSeries(fifteen);

  const asOf =
    thirty.length === 0 && fifteen.length === 0
      ? new Date().toISOString().slice(0, 10)
      : new Date(thirtyYear.currentDate) >= new Date(fifteenYear.currentDate)
      ? thirtyYear.currentDate
      : fifteenYear.currentDate;

  return { thirtyYear, fifteenYear, asOf };
}

/**
 * Backward-compatible single-rate helper used by the dashboard StatsGrid.
 * Returns null when unavailable instead of throwing.
 */
export async function fetchLatestMortgage30US(): Promise<MortgageRateResult | null> {
  const points = await fetchFredSeries("MORTGAGE30US", 1);
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  return {
    rate: latest.value,
    date: latest.date,
    seriesId: "MORTGAGE30US",
  };
}
