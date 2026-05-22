import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchPropertyByAddress, fetchComparableSales } from "@/lib/attom";
import { createHash } from "crypto";
import { calculateAgentDeskEstimate } from "@/lib/valuation";
import type { ZillowProperty, ValuationResult, ValuationInputs, PropertyOverrides } from "@/types";

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
  const supabase = createServerClient();
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
  const key = process.env.ATTOM_API_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes("your-")) return false;
  if (trimmed.toLowerCase().includes("placeholder")) return false;
  if (trimmed.length < 20) return false;
  return true;
}

const MISSING_KEY_MESSAGE =
  "Property lookup unavailable — ATTOM_API_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables and redeploy. See .env.example for setup steps.";

function missingKeyProperty(address: string): ZillowProperty {
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
    errorMessage: MISSING_KEY_MESSAGE,
    errorType: "missing_key",
  };
}

function missingKeyResponse(address: string) {
  console.warn("[property-lookup] ATTOM_API_KEY missing or placeholder");
  return NextResponse.json({
    ok: false,
    status: "error",
    property: missingKeyProperty(address),
    error: "missing_key",
    errorType: "missing_key",
    message: MISSING_KEY_MESSAGE,
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

function missingCoordsProperty(address: string): ZillowProperty {
  return errorZillowProperty(
    address,
    "No coordinates attached to this address. Please select an address from the Google Places dropdown — manually typed addresses cannot be geocoded server-side.",
    "not_found"
  );
}

function invalidCoordsProperty(address: string): ZillowProperty {
  return errorZillowProperty(
    address,
    "Invalid latitude/longitude values. Please refine the address by selecting it from the Google Places dropdown.",
    "not_found"
  );
}

function hashAddress(address: string): string {
  return createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");
}

async function loadPropertyOverrides(
  userId: string,
  addressHash: string
): Promise<PropertyOverrides | null> {
  const supabase = createServerClient();
  if (!supabase || userId === "anonymous") return null;

  try {
    const { data } = await supabase
      .from("property_overrides")
      .select("overrides")
      .eq("user_id", userId)
      .eq("address_hash", addressHash)
      .single();

    if (data?.overrides) {
      return data.overrides as PropertyOverrides;
    }
  } catch (err) {
    console.warn("[property-lookup] failed to load overrides:", err);
  }

  return null;
}

function applyOverrides(
  property: ZillowProperty,
  overrides: PropertyOverrides | null
): ZillowProperty {
  if (!overrides) return property;

  return {
    ...property,
    bedrooms: overrides.bedrooms ?? property.bedrooms,
    bathrooms: overrides.bathrooms ?? property.bathrooms,
    livingArea: overrides.livingArea ?? property.livingArea,
    yearBuilt: overrides.yearBuilt ?? property.yearBuilt,
    propertySubType: overrides.propertySubType ?? property.propertySubType,
    lotSize: overrides.lotSize ?? property.lotSize,
    overrides,
  };
}

async function calculateValuation(
  property: ZillowProperty,
  address: string,
  latitude: number,
  longitude: number,
  userId: string
): Promise<{
  valuation: ValuationResult | null;
  valuationInputs: ValuationInputs | null;
}> {
  if (
    !property.lastSoldPrice ||
    !property.lastSoldDate ||
    !property.livingArea
  ) {
    return { valuation: null, valuationInputs: null };
  }

  const supabase = createServerClient();
  if (!supabase) return { valuation: null, valuationInputs: null };

  const addressHash = hashAddress(address);

  try {
    const { data: cached } = await supabase
      .from("property_valuations")
      .select("*")
      .eq("address_hash", addressHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      const valuation: ValuationResult = {
        estimate: Number(cached.agentdesk_estimate),
        variancePct: Number(cached.variance_pct),
        varianceLow: Number(cached.variance_low),
        varianceHigh: Number(cached.variance_high),
        confidence: cached.confidence as "high" | "medium" | "low",
        compCount: cached.comp_count,
      };

      const valuationInputs: ValuationInputs | null = cached.inputs
        ? (cached.inputs as ValuationInputs)
        : null;

      return { valuation, valuationInputs };
    }
  } catch (err) {
    console.warn("[property-lookup] cache check failed:", err);
  }

  let currentMortgageRate = 7.0;
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fredRes = await fetch(`${origin}/api/mortgage-rate`, {
      headers: { "User-Agent": "AgentDesk/1.0" },
    });
    const fredData = await fredRes.json();
    if (fredData?.rate) currentMortgageRate = fredData.rate;
  } catch (err) {
    console.warn("[property-lookup] FRED fetch failed:", err);
  }

  const comps = await fetchComparableSales(latitude, longitude, 0.5);
  console.log(`[property-lookup] fetched ${comps.length} comps for valuation`);

  const valuationInputs: ValuationInputs = {
    lastSalePrice: property.lastSoldPrice,
    lastSaleDate: property.lastSoldDate,
    subjectSqft: property.livingArea,
    comps,
    currentMortgageRate,
  };

  const valuation = calculateAgentDeskEstimate(valuationInputs);

  try {
    await supabase.from("property_valuations").upsert({
      address_hash: addressHash,
      address,
      agentdesk_estimate: valuation.estimate,
      variance_pct: valuation.variancePct,
      variance_low: valuation.varianceLow,
      variance_high: valuation.varianceHigh,
      confidence: valuation.confidence,
      comp_count: valuation.compCount,
      inputs: valuationInputs,
      calculated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.warn("[property-lookup] cache upsert failed:", err);
  }

  return { valuation, valuationInputs };
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
    `[property-lookup GET] address="${sanitizeForLog(address)}" lat=${latParam} lng=${lngParam} user=${auth.userId}`
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
        property: missingCoordsProperty(address.trim()),
        error: "missing_coordinates",
        errorType: "not_found",
        message:
          "Latitude and longitude are required. Please refine the address by selecting it from the Google Places dropdown.",
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
        errorType: "not_found",
        message:
          "Invalid latitude or longitude values. Please refine the address by selecting it from the Google Places dropdown.",
      },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return missingKeyResponse(address.trim());
  }

  console.log(
    `[property-lookup GET] CALLING ATTOM WITH: address="${sanitizeForLog(address.trim())}" lat=${latitude} lng=${longitude}`
  );

  try {
    let property = await fetchPropertyByAddress(
      address.trim(),
      latitude,
      longitude
    );

    const elapsed = Date.now() - startedAt;
    console.log(
      `[property-lookup GET] ATTOM RESPONSE STATUS: ${property.status}${
        property.errorType ? ` (${property.errorType})` : ""
      }`
    );
    console.log(
      `[property-lookup GET] RESULT: ${JSON.stringify({ zpid: property.zpid, address: property.address, status: property.status, errorMessage: property.errorMessage }).slice(0, 200)}`
    );

    let agentDeskValuation: ValuationResult | null = null;
    let valuationInputs: ValuationInputs | null = null;

    if (property.status === "ok") {
      const addressHash = hashAddress(address.trim());
      const overrides = await loadPropertyOverrides(auth.userId, addressHash);
      property = applyOverrides(property, overrides);

      const valuationData = await calculateValuation(
        property,
        address.trim(),
        latitude,
        longitude,
        auth.userId
      );
      agentDeskValuation = valuationData.valuation;
      valuationInputs = valuationData.valuationInputs;
    }

    const enrichedProperty = {
      ...property,
      agentDeskValuation,
      valuationInputs,
    };

    console.log(
      `[property-lookup GET] result in ${elapsed}ms: status=${property.status}${
        property.errorType ? ` (${property.errorType})` : ""
      } zpid=${property.zpid ?? "null"} valuation=${
        agentDeskValuation ? "yes" : "no"
      }`
    );

    if (property.status === "ok") {
      return NextResponse.json({ ok: true, property: enrichedProperty });
    }
    if (property.status === "no_data") {
      return NextResponse.json({
        ok: false,
        status: "no_data",
        property: enrichedProperty,
        error: property.errorMessage ?? "No data found for this lookup",
        errorType: property.errorType ?? "not_found",
      });
    }
    return NextResponse.json({
      ok: false,
      status: "error",
      property: enrichedProperty,
      error: property.errorMessage ?? "Data unavailable",
      errorType: property.errorType ?? "unknown",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(`[property-lookup GET] threw: ${message}`, err);
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

  console.log(
    `[property-lookup POST] LOOKUP REQUEST: batch=${entries.length} user=${
      auth.userId
    } addresses=${JSON.stringify(
      entries.map((e) => ({
        address: sanitizeForLog(e.address, 40),
        lat: e.latitude,
        lng: e.longitude,
      }))
    )}`
  );

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
    console.warn("[property-lookup POST] ATTOM_API_KEY missing or placeholder");
    return NextResponse.json({
      ok: false,
      status: "error",
      error: "missing_key",
      errorType: "missing_key",
      message: MISSING_KEY_MESSAGE,
      properties: entries.map((e) => missingKeyProperty(e.address)),
    });
  }

  try {
    const properties = await Promise.all(
      entries.map(async (item, idx) => {
        if (item.latitude === undefined || item.longitude === undefined) {
          console.log(
            `[property-lookup POST] MISSING COORDS [${idx}]: address="${sanitizeForLog(
              item.address
            )}" — returning not_found`
          );
          return missingCoordsProperty(item.address);
        }
        if (
          !Number.isFinite(item.latitude) ||
          !Number.isFinite(item.longitude) ||
          item.latitude < -90 ||
          item.latitude > 90 ||
          item.longitude < -180 ||
          item.longitude > 180
        ) {
          console.log(
            `[property-lookup POST] INVALID COORDS [${idx}]: address="${sanitizeForLog(
              item.address
            )}" lat=${item.latitude} lng=${item.longitude}`
          );
          return invalidCoordsProperty(item.address);
        }
        console.log(
          `[property-lookup POST] CALLING ATTOM WITH [${idx}]: address="${sanitizeForLog(
            item.address
          )}" lat=${item.latitude} lng=${item.longitude}`
        );
        let result = await fetchPropertyByAddress(
          item.address,
          item.latitude,
          item.longitude
        );
        console.log(
          `[property-lookup POST] ATTOM RESPONSE STATUS [${idx}]: ${result.status}${
            result.errorType ? ` (${result.errorType})` : ""
          }`
        );
        console.log(
          `[property-lookup POST] RESULT [${idx}]: ${JSON.stringify({
            zpid: result.zpid,
            address: result.address,
            status: result.status,
          }).slice(0, 150)}`
        );

        let agentDeskValuation: ValuationResult | null = null;
        let valuationInputs: ValuationInputs | null = null;

        if (result.status === "ok") {
          const addressHash = hashAddress(item.address);
          const overrides = await loadPropertyOverrides(auth.userId, addressHash);
          result = applyOverrides(result, overrides);

          const valuationData = await calculateValuation(
            result,
            item.address,
            item.latitude,
            item.longitude,
            auth.userId
          );
          agentDeskValuation = valuationData.valuation;
          valuationInputs = valuationData.valuationInputs;
        }

        return {
          ...result,
          agentDeskValuation,
          valuationInputs,
        };
      })
    );

    const elapsed = Date.now() - startedAt;
    const okCount = properties.filter((p) => p.status === "ok").length;
    console.log(
      `[property-lookup POST] batch result in ${elapsed}ms: ok=${okCount}/${properties.length}`
    );
    return NextResponse.json({ ok: true, properties });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(`[property-lookup POST batch] threw:`, message, err);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: message,
        errorType: "connection_error",
        message: `Batch lookup failed: ${message}. Retry in a moment — this is usually transient.`,
        properties: entries.map((e) =>
          errorZillowProperty(
            e.address,
            `Lookup failed unexpectedly: ${message}. Retry in a moment — this is usually transient.`,
            "connection_error"
          )
        ),
      },
      { status: 200 }
    );
  }
}
