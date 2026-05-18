import type { ZillowProperty, ComparisonProperty, ComparisonResult } from "@/types";

// ---------------------------------------------------------------------------
// Zillow Live Data Scraper (RapidAPI)
// Host: zillow-com-live-data-scraper-api.p.rapidapi.com
//
// All calls go through this module (server-only). The browser hits
// /api/property-lookup, which calls these helpers — RAPIDAPI_KEY is never
// exposed to the client bundle.
// ---------------------------------------------------------------------------

const ZILLOW_HOST = "zillow-com-live-data-scraper-api.p.rapidapi.com";
const ZILLOW_BASE = `https://${ZILLOW_HOST}`;
const ZILLOW_BYCOORDINATES_URL = `${ZILLOW_BASE}/bycoordinates`;

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function hasUsableServerKey(): string | null {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().includes("your-")) return null;
  if (trimmed.toLowerCase().includes("placeholder")) return null;
  if (trimmed.length < 20) return null;
  return trimmed;
}

function rapidApiHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-rapidapi-host": ZILLOW_HOST,
    "x-rapidapi-key": apiKey,
  };
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type ErrorType =
  | "not_found"
  | "connection_error"
  | "rate_limited"
  | "missing_key"
  | "invalid_address"
  | "unauthorized"
  | "timeout"
  | "unknown";

function emptyProperty(
  address: string,
  status: "no_data" | "error",
  errorMessage?: string,
  errorType?: ErrorType
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
    status,
    errorMessage,
    errorType: errorType as ZillowProperty["errorType"],
  };
}

function normalizeProperty(
  raw: Record<string, unknown>,
  fallbackAddress: string
): ZillowProperty {
  const price = toNumber(raw.price);
  const livingArea = toNumber(raw.sqft);
  const pricePerSqft =
    price && livingArea && livingArea > 0 ? Math.round(price / livingArea) : null;

  return {
    zpid: toStringOrNull(raw.zpid),
    address: toStringOrNull(raw.address) || fallbackAddress,
    price,
    zestimate: null,
    bedrooms: toNumber(raw.beds),
    bathrooms: toNumber(raw.baths),
    livingArea,
    lotSize: null,
    yearBuilt: null,
    propertyType: toStringOrNull(raw.property_type),
    daysOnMarket: null,
    pricePerSqft,
    lastSoldPrice: null,
    lastSoldDate: null,
    taxAssessedValue: null,
    photo: toStringOrNull(raw.photo_url),
    status: "ok",
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    try {
      const res = await fetchWithTimeout(url, init, REQUEST_TIMEOUT_MS);
      const elapsed = Date.now() - attemptStart;
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const backoff = 500 * Math.pow(2, attempt);
        console.warn(
          `[zillow] ${label} attempt ${attempt + 1} got ${res.status} after ${elapsed}ms, retrying in ${backoff}ms`
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      if (attempt > 0) {
        console.log(
          `[zillow] ${label} attempt ${attempt + 1} succeeded after ${elapsed}ms`
        );
      }
      return res;
    } catch (err) {
      lastError = err;
      const elapsed = Date.now() - attemptStart;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const errName = err instanceof Error ? err.name : "Error";
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[zillow] ${label} attempt ${attempt + 1} ${isAbort ? "timed out" : "threw"} after ${elapsed}ms (${errName}): ${errMsg}`
      );
      if (attempt < MAX_RETRIES) {
        const backoff = isAbort ? 1500 * Math.pow(2, attempt) : 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Network error after retries");
}

/**
 * Finds the best match for an input address among Zillow results.
 * Filters out results with missing coordinates before distance calc to avoid
 * the divide-by-zero / null-coercion bug where toNumber()=>null becomes 0.
 */
function findBestMatch(
  results: Array<Record<string, unknown>>,
  inputAddress: string,
  lat: number,
  lng: number
): Record<string, unknown> | null {
  if (!results || results.length === 0) return null;

  const input = inputAddress.toLowerCase().trim();

  // First try exact address match (works even without coordinates).
  const exact = results.find((r) => {
    const addr = toStringOrNull(r.address);
    return addr && addr.toLowerCase().trim() === input;
  });
  if (exact) return exact;

  // Filter to results with valid numeric coordinates so distance math is real.
  const withCoords = results.filter((r) => {
    const rLat = toNumber(r.latitude);
    const rLng = toNumber(r.longitude);
    return rLat !== null && rLng !== null;
  });

  if (withCoords.length === 0) {
    // No usable coordinates anywhere — fall back to the first result rather
    // than returning null (Zillow occasionally omits geo on partial hits).
    return results[0] ?? null;
  }

  let best = withCoords[0];
  const bestLat0 = toNumber(best.latitude) as number;
  const bestLng0 = toNumber(best.longitude) as number;
  let bestDist = Math.abs(bestLat0 - lat) + Math.abs(bestLng0 - lng);

  for (let i = 1; i < withCoords.length; i++) {
    const current = withCoords[i];
    const cLat = toNumber(current.latitude) as number;
    const cLng = toNumber(current.longitude) as number;
    const currDist = Math.abs(cLat - lat) + Math.abs(cLng - lng);
    if (currDist < bestDist) {
      best = current;
      bestDist = currDist;
    }
  }

  return best;
}

export async function fetchZillowPropertyByCoordinates(
  address: string,
  latitude: number,
  longitude: number
): Promise<ZillowProperty> {
  const apiKey = hasUsableServerKey();

  if (!apiKey) {
    console.warn("[zillow] RAPIDAPI_KEY missing or placeholder");
    return emptyProperty(
      address,
      "error",
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      "missing_key"
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return emptyProperty(
      address,
      "no_data",
      "Invalid coordinates provided.",
      "invalid_address"
    );
  }

  const url = `${ZILLOW_BYCOORDINATES_URL}?lat=${latitude}&lng=${longitude}&page=1&listType=for-sale`;
  const label = `bycoordinates "${address}" (${latitude},${longitude})`;
  const start = Date.now();

  try {
    console.log(`[zillow] ${label} → ${ZILLOW_HOST}`);
    const res = await fetchWithRetry(
      url,
      { method: "GET", headers: rapidApiHeaders(apiKey), cache: "no-store" },
      label
    );
    const totalElapsed = Date.now() - start;

    if (!res.ok) {
      let bodySnippet = "";
      try {
        const text = await res.text();
        bodySnippet = text.slice(0, 200);
      } catch {
        /* ignore */
      }
      console.warn(
        `[zillow] ${label} → HTTP ${res.status} after ${totalElapsed}ms ${bodySnippet}`
      );

      if (res.status === 404) {
        return emptyProperty(
          address,
          "no_data",
          "Zillow has no record of this property. Try a different address or verify the property exists on zillow.com.",
          "not_found"
        );
      }
      if (res.status === 401 || res.status === 403) {
        return emptyProperty(
          address,
          "error",
          "RapidAPI rejected the request (401/403). Verify your RAPIDAPI_KEY is active and that your account is subscribed to the 'Zillow.com Live Data Scraper' host.",
          "unauthorized"
        );
      }
      if (res.status === 429) {
        return emptyProperty(
          address,
          "error",
          "RapidAPI rate limit hit (429). Wait a moment and retry, or upgrade your RapidAPI subscription tier.",
          "rate_limited"
        );
      }
      return emptyProperty(
        address,
        "error",
        `Zillow upstream returned HTTP ${res.status}. This is usually a temporary RapidAPI/Zillow outage — try again in a minute.`,
        "connection_error"
      );
    }

    const payload = (await res.json().catch(() => null)) as unknown;

    if (!payload || typeof payload !== "object") {
      console.log(`[zillow] ${label} → invalid response (${totalElapsed}ms)`);
      return emptyProperty(
        address,
        "error",
        "Invalid response from Zillow API.",
        "unknown"
      );
    }

    const payloadObj = payload as Record<string, unknown>;
    const results = Array.isArray(payloadObj.results)
      ? (payloadObj.results as Array<Record<string, unknown>>)
      : [];

    if (results.length === 0) {
      console.log(`[zillow] ${label} → no results (${totalElapsed}ms)`);
      return emptyProperty(
        address,
        "no_data",
        "No properties found near these coordinates. The property may not be listed on Zillow or the coordinates may be incorrect.",
        "not_found"
      );
    }

    const bestMatch = findBestMatch(results, address, latitude, longitude);

    if (!bestMatch) {
      console.log(`[zillow] ${label} → no match found (${totalElapsed}ms)`);
      return emptyProperty(
        address,
        "no_data",
        "Could not match this address to a Zillow property. Try verifying the address on zillow.com.",
        "not_found"
      );
    }

    console.log(`[zillow] ${label} → ok (${totalElapsed}ms)`);
    return normalizeProperty(bestMatch, address);
  } catch (err) {
    const totalElapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : "Network error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errName = err instanceof Error ? err.name : "Error";
    console.error(
      `[zillow] ${label} failed after ${totalElapsed}ms (${errName}): ${message}`
    );

    const lowered = message.toLowerCase();
    const isDns =
      lowered.includes("enotfound") || lowered.includes("eai_again");
    const isReset =
      lowered.includes("econnreset") ||
      lowered.includes("econnrefused") ||
      lowered.includes("socket hang up");

    if (isAbort) {
      return emptyProperty(
        address,
        "error",
        "Zillow took too long to respond (30s timeout). The RapidAPI host may be slow or cold-starting — retry in a moment.",
        "timeout"
      );
    }
    if (isDns) {
      return emptyProperty(
        address,
        "error",
        "Couldn't resolve the RapidAPI host. This usually means the Zillow scraper host name changed or your network can't reach RapidAPI. Verify the host on your RapidAPI dashboard.",
        "connection_error"
      );
    }
    if (isReset) {
      return emptyProperty(
        address,
        "error",
        "RapidAPI dropped the connection. This is usually transient — retry the lookup.",
        "connection_error"
      );
    }

    return emptyProperty(
      address,
      "error",
      `Couldn't reach Zillow: ${message}. Verify the server has network access and that your RapidAPI subscription is active.`,
      "connection_error"
    );
  }
}

function toComparisonProperty(p: ZillowProperty): ComparisonProperty {
  return {
    zpid: p.zpid,
    address: p.address,
    price: p.price,
    zestimate: p.zestimate,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    livingArea: p.livingArea,
    lotSize: p.lotSize,
    yearBuilt: p.yearBuilt,
    propertyType: p.propertyType,
    daysOnMarket: p.daysOnMarket,
    pricePerSqft: p.pricePerSqft,
    lastSoldPrice: p.lastSoldPrice,
    lastSoldDate: p.lastSoldDate,
    taxAssessedValue: p.taxAssessedValue,
    photo: p.photo,
  };
}

/**
 * Client-side helper: looks up a single property via our server proxy route,
 * keeping the RapidAPI key off the browser.
 */
export async function fetchPropertyByAddress(
  address: string,
  latitude?: number,
  longitude?: number
): Promise<ComparisonResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { kind: "error", address: trimmed, message: "Empty address" };
  }

  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      kind: "error",
      address: trimmed,
      message:
        "Coordinates are required. Please select an address from the Google Places dropdown.",
    };
  }

  try {
    const params = new URLSearchParams({
      address: trimmed,
      latitude: String(latitude),
      longitude: String(longitude),
    });
    const res = await fetch(`/api/property-lookup?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          property?: ZillowProperty;
          error?: string;
          message?: string;
        }
      | null;

    if (!data) {
      return {
        kind: "error",
        address: trimmed,
        message: "Data unavailable — check your connection",
      };
    }

    if (data.error === "missing_key") {
      return {
        kind: "error",
        address: trimmed,
        message:
          data.message ??
          "Property lookup unavailable — connect a RapidAPI key to enable Zillow data.",
      };
    }

    const property = data.property;

    if (!property || property.status === "error") {
      return {
        kind: "error",
        address: trimmed,
        message:
          property?.errorMessage ??
          data.error ??
          "Data unavailable — check your connection",
      };
    }

    if (property.status === "no_data") {
      return { kind: "empty", address: trimmed };
    }

    return {
      kind: "success",
      address: property.address || trimmed,
      property: toComparisonProperty(property),
    };
  } catch {
    return {
      kind: "error",
      address: trimmed,
      message: "Data unavailable — check your connection",
    };
  }
}

/**
 * Parallel lookup for the comparator. Uses Promise.allSettled so one failure
 * never breaks the rest of the cards.
 */
export async function fetchPropertiesByAddress(
  addressesWithCoords: Array<{
    address: string;
    latitude?: number;
    longitude?: number;
  }>
): Promise<ComparisonResult[]> {
  const settled = await Promise.allSettled(
    addressesWithCoords.map((item) =>
      fetchPropertyByAddress(item.address, item.latitude, item.longitude)
    )
  );
  return settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    return {
      kind: "error" as const,
      address: addressesWithCoords[i]?.address ?? "",
      message: "Data unavailable — check your connection",
    };
  });
}
