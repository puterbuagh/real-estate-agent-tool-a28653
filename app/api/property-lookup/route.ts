import { NextRequest, NextResponse } from "next/server";
import { fetchZillowProperties, fetchZillowProperty } from "@/lib/zillow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasUsableKey(): boolean {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes("your-")) return false;
  if (trimmed.toLowerCase().includes("placeholder")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !address.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing required query param: address" },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return NextResponse.json({
      ok: false,
      status: "error",
      error: "missing_key",
      message:
        "Property lookup unavailable — connect a RapidAPI key (RAPIDAPI_KEY) to enable Zillow data.",
    });
  }

  try {
    const property = await fetchZillowProperty(address);
    if (property.status === "ok") {
      return NextResponse.json({ ok: true, property });
    }
    if (property.status === "no_data") {
      return NextResponse.json({
        ok: false,
        status: "no_data",
        property,
        error: "No data found for this address",
      });
    }
    return NextResponse.json({
      ok: false,
      status: "error",
      property,
      error: property.errorMessage ?? "Data unavailable",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json(
      { ok: false, status: "error", error: message },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const raw = (body as { addresses?: unknown })?.addresses;
  const addresses = Array.isArray(raw)
    ? (raw as unknown[]).map((v) => String(v))
    : [];

  if (addresses.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Body must include a non-empty addresses[] array" },
      { status: 400 }
    );
  }

  if (addresses.length > 5) {
    return NextResponse.json(
      { ok: false, error: "Maximum of 5 addresses per request" },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return NextResponse.json({
      ok: false,
      error: "missing_key",
      message:
        "Property lookup unavailable — connect a RapidAPI key (RAPIDAPI_KEY) to enable Zillow data.",
      properties: [],
    });
  }

  try {
    const properties = await fetchZillowProperties(addresses);
    return NextResponse.json({ ok: true, properties });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json(
      { ok: false, error: message, properties: [] },
      { status: 200 }
    );
  }
}
