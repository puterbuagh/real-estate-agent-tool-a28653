import { NextResponse } from "next/server";
import { fetchMortgageRates } from "@/lib/fred";

export const revalidate = 3600;

export async function GET() {
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
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
