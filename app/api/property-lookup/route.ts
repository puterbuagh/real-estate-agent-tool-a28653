import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPropertyByCoordinates } from "@/lib/zillow";
import type { ZillowProperty } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const prior = rateBuckets.get(userId) ?? [];
  const recent = prior.filter((t) => t > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldest));
    return { ok: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  rateBuckets.set(userId, recent);

  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      const filtered = v.filter((t) => t > cutoff);
      if (filtered.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, filtered);
    }
  }

  return { ok: true, retryAfterSec: 0 };
}

async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: true, userId: "anonymous" };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: true, userId: "anonymous" };
    }

    return { ok: true, userId: user.id };
  } catch {
    return { ok: true, userId: "anonymous" };
  }
}

function enforceRateLimit(userId: string): NextResponse | null {
  const rl = checkRateLimit(userId);
  if (rl.ok) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "rate_limited",
      errorType: "rate_limited",
      message: `Too many requests. Try again in ${rl.retryAfterSec}s.`,
      retryAfter: rl.retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    }
  );
}

function hasUsableKey(): boolean {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes("your-")) return false;
  if (trimmed.toLowerCase().includes("placeholder")) return false;
  if (trimmed.length < 20) return false;
  return true;
}

function missingKeyResponse() {
  console.warn("[property-lookup] RAPIDAPI_KEY missing or placeholder");
  return NextResponse.json({
    ok: false,
    status: "error",
    error: "missing_key",
    errorType: "missing_key",
    message:
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables and redeploy. See .env.example for setup steps.",
  });
}

function sanitizeForLog(input: string | null | undefined, max = 60): string {
  if (!input) return "-";
  const trimmed = String(input).trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function errorZillowProperty(
  address: string,
  errorMessage: string,
  errorType: ZillowProperty["errorType"]
): ZillowProperty {
  return {
    zpid: null,
    address,
    price: null,
    zestimate: null,
    bedrooms: null,
    bathrooms: null,
    livingArea: null,
    lotSize: null,
    yearBuilt: null,
    propertyType: null,
    daysOnMarket: null,
    pricePerSqft: null,
    lastSoldPrice: null,
    lastSoldDate: null,
    taxAssessedValue: null,
    photo: null,
    status: "error",
    errorMessage,
    errorType,
  };
}

function invalidCoordsProperty(address: string): ZillowProperty {
  return errorZillowProperty(
    address,
    "Missing or invalid coordinates. Select this address from the Google Places dropdown to attach latitude/longitude.",
    "invalid_address"
  );
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limited = enforceRateLimit(auth.userId);
  if (limited) return limited;

  const address = req.nextUrl.searchParams.get("address");
  const latParam = req.nextUrl.searchParams.get("latitude");
  const lngParam = req.nextUrl.searchParams.get("longitude");

  console.log(
    `[property-lookup GET] address=${sanitizeForLog(address)} lat=${latParam} lng=${lngParam} user=${auth.userId}`
  );

  if (!address?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_param",
        errorType: "invalid_address",
        message: "Provide an 'address' query parameter.",
      },
      { status: 400 }
    );
  }

  if (!latParam || !lngParam) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        property: invalidCoordsProperty(address.trim()),
        error: "missing_coordinates",
        errorType: "invalid_address",
        message:
          "Latitude and longitude are required. Please select an address from the Google Places dropdown.",
      },
      { status: 400 }
    );
  }

  const latitude = Number(latParam);
  const longitude = Number(lngParam);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        property: invalidCoordsProperty(address.trim()),
        error: "invalid_coordinates",
        errorType: "invalid_address",
        message: "Invalid latitude or longitude values.",
      },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return missingKeyResponse();
  }

  try {
    const property = await fetchPropertyByCoordinates(
      address.trim(),
      latitude,
      longitude
    );

    const elapsed = Date.now() - startedAt;
    console.log(
      `[property-lookup GET] done in ${elapsed}ms status=${property.status}${
        property.errorType ? ` (${property.errorType})` : ""
      }`
    );

    if (property.status === "ok") {
      return NextResponse.json({ ok: true, property });
    }
    if (property.status === "no_data") {
      return NextResponse.json({
        ok: false,
        status: "no_data",
        property,
        error: property.errorMessage ?? "No data found for this lookup",
        errorType: property.errorType ?? "not_found",
      });
    }
    return NextResponse.json({
      ok: false,
      status: "error",
      property,
      error: property.errorMessage ?? "Data unavailable",
      errorType: property.errorType ?? "unknown",
    });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(`[property-lookup GET] threw after ${elapsed}ms:`, message);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        property: errorZillowProperty(
          address?.trim() ?? "",
          `Lookup failed unexpectedly: ${message}. Retry in a moment — this is usually transient.`,
          "connection_error"
        ),
        error: message,
        errorType: "connection_error",
        message: `Lookup failed unexpectedly: ${message}. Retry in a moment — this is usually transient.`,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limited = enforceRateLimit(auth.userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        errorType: "invalid_address",
        message: "Request body must be valid JSON.",
      },
      { status: 400 }
    );
  }

  const bodyObj = (body ?? {}) as {
    addresses?: unknown;
    coordinates?: unknown;
  };

  const rawAddresses = Array.isArray(bodyObj.addresses)
    ? (bodyObj.addresses as unknown[])
    : [];
  const rawCoords = Array.isArray(bodyObj.coordinates)
    ? (bodyObj.coordinates as unknown[])
    : [];

  type Entry = {
    address: string;
    latitude: number | undefined;
    longitude: number | undefined;
  };

  const entries: Entry[] = rawAddresses.map((v, i) => {
    const coordItem = rawCoords[i];
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (coordItem && typeof coordItem === "object") {
      const lat = Number((coordItem as { latitude?: unknown }).latitude);
      const lng = Number((coordItem as { longitude?: unknown }).longitude);
      if (Number.isFinite(lat)) latitude = lat;
      if (Number.isFinite(lng)) longitude = lng;
    }
    return {
      address: String(v ?? "").trim(),
      latitude,
      longitude,
    };
  });

  if (entries.length === 0 || entries.every((e) => !e.address)) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_param",
        errorType: "invalid_address",
        message:
          "Provide a non-empty addresses[] array with corresponding coordinates[] in the request body.",
      },
      { status: 400 }
    );
  }

  if (entries.length > 5) {
    return NextResponse.json(
      {
        ok: false,
        error: "too_many",
        errorType: "invalid_address",
        message: "Maximum of 5 addresses per request.",
      },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return NextResponse.json({
      ok: false,
      error: "missing_key",
      errorType: "missing_key",
      message:
        "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      properties: [],
    });
  }

  try {
    console.log(
      `[property-lookup POST] batch=${entries.length} user=${
        auth.userId
      } samples=[${entries
        .slice(0, 3)
        .map((a) => sanitizeForLog(a.address, 40))
        .join(" | ")}${entries.length > 3 ? " | …" : ""}]`
    );

    const properties = await Promise.all(
      entries.map(async (item) => {
        if (
          item.latitude === undefined ||
          item.longitude === undefined ||
          !Number.isFinite(item.latitude) ||
          !Number.isFinite(item.longitude) ||
          item.latitude < -90 ||
          item.latitude > 90 ||
          item.longitude < -180 ||
          item.longitude > 180
        ) {
          return invalidCoordsProperty(item.address);
        }
        return fetchPropertyByCoordinates(
          item.address,
          item.latitude,
          item.longitude
        );
      })
    );

    const okCount = properties.filter((p) => p.status === "ok").length;
    const errCount = properties.filter((p) => p.status === "error").length;
    const noDataCount = properties.filter((p) => p.status === "no_data").length;
    const elapsed = Date.now() - startedAt;
    console.log(
      `[property-lookup POST] result in ${elapsed}ms ok=${okCount} no_data=${noDataCount} error=${errCount}`
    );
    return NextResponse.json({ ok: true, properties });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(
      `[property-lookup POST batch] threw after ${elapsed}ms:`,
      message
    );
    return NextResponse.json(
      {
        ok: false,
        error: message,
        errorType: "connection_error",
        message: `Batch lookup failed: ${message}. Retry in a moment — this is usually transient.`,
        properties: [],
      },
      { status: 200 }
    );
  }
}
