import { NextResponse } from "next/server";
import { fetchMortgageRates } from "@/lib/fred";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith("your-") ||
    lower === "changeme" ||
    lower === "placeholder" ||
    lower.includes("your-fred")
  );
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_FRED_API_KEY;
  if (isPlaceholderKey(key)) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_key",
        message:
          "FRED API key not configured. Add NEXT_PUBLIC_FRED_API_KEY to enable live rates.",
        data: {
          thirtyYear: { current: null, currentDate: null, history: [] },
          fifteenYear: { current: null, currentDate: null, history: [] },
          asOf: null,
        },
      },
      { status: 200 }
    );
  }

  try {
    const data = await fetchMortgageRates();
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch mortgage rate";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        data: {
          thirtyYear: { current: null, currentDate: null, history: [] },
          fifteenYear: { current: null, currentDate: null, history: [] },
          asOf: null,
        },
      },
      { status: 200 }
    );
  }
}
