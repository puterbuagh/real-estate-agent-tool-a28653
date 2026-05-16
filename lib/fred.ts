import type {
  FredResponse,
  MortgageRateResult,
  RatePoint,
  RateSeries,
  MortgageRatesPayload,
} from "@/types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FRED_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_FRED_API_KEY environment variable. Add it to .env.local."
    );
  }
  return apiKey.trim();
}

/**
 * Fetch the N most recent observations for any FRED series.
 */
export async function fetchFredSeries(
  seriesId: string,
  limit = 12
): Promise<RatePoint[]> {
  const apiKey = getApiKey();
  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`FRED request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as FredResponse;
  const observations = data?.observations ?? [];

  // Filter out missing observations and parse to numbers, return ascending order for charting.
  const points: RatePoint[] = observations
    .filter((o) => o.value && o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((p) => Number.isFinite(p.value))
    .reverse();

  if (points.length === 0) {
    throw new Error(`FRED returned no usable observations for ${seriesId}.`);
  }

  return points;
}

function toRateSeries(points: RatePoint[]): RateSeries {
  const latest = points[points.length - 1];
  return {
    current: latest.value,
    currentDate: latest.date,
    history: points,
  };
}

/**
 * Fetch MORTGAGE30US and MORTGAGE15US, each with 12 weeks of history.
 */
export async function fetchMortgageRates(): Promise<MortgageRatesPayload> {
  const [thirty, fifteen] = await Promise.all([
    fetchFredSeries("MORTGAGE30US", 12),
    fetchFredSeries("MORTGAGE15US", 12),
  ]);

  const thirtyYear = toRateSeries(thirty);
  const fifteenYear = toRateSeries(fifteen);

  // asOf = most recent date across the two series
  const asOf =
    new Date(thirtyYear.currentDate) >= new Date(fifteenYear.currentDate)
      ? thirtyYear.currentDate
      : fifteenYear.currentDate;

  return { thirtyYear, fifteenYear, asOf };
}

/**
 * Backward-compatible single-rate helper used by the dashboard StatsGrid.
 */
export async function fetchLatestMortgage30US(): Promise<MortgageRateResult> {
  const points = await fetchFredSeries("MORTGAGE30US", 1);
  const latest = points[points.length - 1];
  return {
    rate: latest.value,
    date: latest.date,
    seriesId: "MORTGAGE30US",
  };
}
