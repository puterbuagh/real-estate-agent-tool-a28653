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
const ZILLOW_ADDRESS_URL = `${ZILLOW_BASE}/byaddress`;
const ZILLOW_MLSID_URL = `${ZILLOW_BASE}/bymlsid`;

// Bumped from 12s → 30s. Vercel serverless cold starts + RapidAPI proxy
// latency frequently exceed 12s on the first request of a session, surfacing
// as a misleading "connection error" when the upstream is actually fine.
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function hasUsableServerKey(): string | null {
  // SERVER-ONLY. Never reference NEXT_PUBLIC_RAPIDAPI_KEY — that would inline
  // the key into the browser bundle and allow quota abuse.
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

function firstPhoto(raw: Record<string, unknown> | null | undefined): string | null {
  if (!raw) return null;
  const photos = (raw as { photos?: unknown }).photos;
  if (Array.isArray(photos) && photos.length > 0) {
    const p = photos[0] as unknown;
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      const obj = p as Record<string, unknown>;
      if (typeof obj.url === "string") return obj.url;
      const mixed = obj.mixedSources as Record<string, unknown> | undefined;
      const jpegs = mixed && (mixed.jpeg as Array<{ url?: string }> | undefined);
      if (Array.isArray(jpegs) && jpegs[0]?.url) return jpegs[0].url;
    }
  }
  if (typeof (raw as { imgSrc?: unknown }).imgSrc === "string") {
    return String((raw as { imgSrc?: unknown }).imgSrc);
  }
  if (typeof (raw as { hiResImageLink?: unknown }).hiResImageLink === "string") {
    return String((raw as { hiResImageLink?: unknown }).hiResImageLink);
  }
  return null;
}

function formattedAddress(raw: Record<string, unknown> | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const addr = (raw as { address?: unknown }).address;
  if (typeof addr === "string" && addr.trim()) return addr;
  const a = (addr && typeof addr === "object" ? addr : raw) as Record<string, unknown>;
  const parts = [a.streetAddress, a.city, a.state, a.zipcode].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return fallback;
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
  const price =
    toNumber(raw.price) ??
    toNumber(raw.listPrice) ??
    toNumber(raw.listingPrice) ??
    toNumber(raw.zestimate);
  const zestimate = toNumber(raw.zestimate);
  const livingArea = toNumber(raw.livingArea) ?? toNumber(raw.livingAreaValue);
  const resoFacts = raw.resoFacts as Record<string, unknown> | undefined;
  const explicitPpsf =
    toNumber(raw.pricePerSquareFoot) ?? toNumber(resoFacts?.pricePerSquareFoot);
  const pricePerSqft =
    explicitPpsf ??
    (price && livingArea && livingArea > 0 ? Math.round(price / livingArea) : null);

  return {
    zpid: toStringOrNull(raw.zpid),
    address: formattedAddress(raw, fallbackAddress),
    price,
    zestimate,
    bedrooms: toNumber(raw.bedrooms),
    bathrooms: toNumber(raw.bathrooms),
    livingArea,
    lotSize:
      (raw.lotSize as number | string | undefined) ??
      (raw.lotAreaValue as number | string | undefined) ??
      null,
    yearBuilt: toNumber(raw.yearBuilt),
    propertyType: toStringOrNull(
      raw.propertyTypeDimension ?? raw.homeType ?? raw.propertyType
    ),
    daysOnMarket: toNumber(raw.daysOnZillow ?? raw.daysOnMarket),
    pricePerSqft,
    lastSoldPrice: toNumber(raw.lastSoldPrice),
    lastSoldDate: toStringOrNull(raw.dateSold ?? raw.lastSoldDate),
    taxAssessedValue: toNumber(raw.taxAssessedValue),
    photo: firstPhoto(raw),
    status: "ok",
  };
}

function extractFirstRecord(
  payload: unknown
): Record<string, unknown> | null {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    return (payload[0] as Record<string, unknown>) ?? null;
  }
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data) && obj.data.length > 0) {
      return obj.data[0] as Record<string, unknown>;
    }
    if (Array.isArray(obj.results) && obj.results.length > 0) {
      return obj.results[0] as Record<string, unknown>;
    }
    if (Array.isArray(obj.properties) && obj.properties.length > 0) {
      return obj.properties[0] as Record<string, unknown>;
    }
    if (obj.property && typeof obj.property === "object") {
      return obj.property as Record<string, unknown>;
    }
    if (obj.zpid || obj.address || obj.price || obj.zestimate) {
      return obj;
    }
  }
  return null;
}

/**
 * Normalize free-form address input to maximize Zillow match rate.
 * - Collapses whitespace
 * - Strips trailing punctuation
 * - Uppercases the 2-letter state abbreviation when it appears before a ZIP
 * - Ensures a comma between street and city if obviously missing
 */
function normalizeAddressInput(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/[,;\s]+$/g, "");
  // Uppercase state code when followed by 5-digit ZIP
  s = s.replace(/\b([a-zA-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/g, (_m, st, zip) => `${String(st).toUpperCase()} ${zip}`);
  // collapse double commas
  s = s.replace(/,\s*,/g, ",");
  return s;
}

/** Minimal address sanity check before burning a quota call. */
function looksLikeAddress(input: string): boolean {
  const s = input.trim();
  if (s.length < 5) return false;
  if (!/\d/.test(s)) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  return true;
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

/**
 * Fetch with retry + exponential backoff for transient failures.
 * Retries on 5xx, 429, and network errors (incl. ENOTFOUND/ECONNRESET).
 * Returns the final Response or throws the last error.
 */
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
        // Longer backoff on timeouts — upstream may be cold/warming.
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

export async function fetchZillowProperty(address: string): Promise<ZillowProperty> {
  const normalized = normalizeAddressInput(address);
  const apiKey = hasUsableServerKey();

  if (!apiKey) {
    console.warn("[zillow] RAPIDAPI_KEY missing or placeholder");
    return emptyProperty(
      normalized,
      "error",
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      "missing_key"
    );
  }

  if (!looksLikeAddress(normalized)) {
    return emptyProperty(
      normalized,
      "no_data",
      "That doesn't look like a complete address. Include a street number, street name, city, and state — e.g. \"123 Main St, Tampa, FL 33601\".",
      "invalid_address"
    );
  }

  const url = `${ZILLOW_ADDRESS_URL}?address=${encodeURIComponent(normalized)}`;
  const label = `byaddress "${normalized}"`;
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
      console.warn(`[zillow] ${label} → HTTP ${res.status} after ${totalElapsed}ms ${bodySnippet}`);

      if (res.status === 404) {
        return emptyProperty(
          normalized,
          "no_data",
          "Zillow has no record of this address. Try the full USPS form — \"123 Main St, Tampa, FL 33601\" — including city, state, and ZIP. If it's new construction or off-market, Zillow may not have indexed it yet.",
          "not_found"
        );
      }
      if (res.status === 401 || res.status === 403) {
        return emptyProperty(
          normalized,
          "error",
          "RapidAPI rejected the request (401/403). Verify your RAPIDAPI_KEY is active and that your account is subscribed to the \"Zillow.com Live Data Scraper\" host.",
          "unauthorized"
        );
      }
      if (res.status === 429) {
        return emptyProperty(
          normalized,
          "error",
          "RapidAPI rate limit hit (429). Wait a moment and retry, or upgrade your RapidAPI subscription tier.",
          "rate_limited"
        );
      }
      return emptyProperty(
        normalized,
        "error",
        `Zillow upstream returned HTTP ${res.status}. This is usually a temporary RapidAPI/Zillow outage — try again in a minute.`,
        "connection_error"
      );
    }

    const payload = (await res.json().catch(() => null)) as unknown;
    const raw = extractFirstRecord(payload);

    if (!raw || (raw.error && !raw.zpid)) {
      console.log(`[zillow] ${label} → no record in response (${totalElapsed}ms)`);
      return emptyProperty(
        normalized,
        "no_data",
        "Zillow returned no matching property. Try the full form including city, state, and ZIP (e.g. \"123 Main St, Tampa, FL 33601\"), or look it up on zillow.com first to confirm it's indexed.",
        "not_found"
      );
    }

    console.log(`[zillow] ${label} → ok (${totalElapsed}ms)`);
    return normalizeProperty(raw, normalized);
  } catch (err) {
    const totalElapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : "Network error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errName = err instanceof Error ? err.name : "Error";
    console.error(`[zillow] ${label} failed after ${totalElapsed}ms (${errName}): ${message}`);

    // Classify common Node fetch network failures more precisely.
    const lowered = message.toLowerCase();
    const isDns = lowered.includes("enotfound") || lowered.includes("eai_again");
    const isReset = lowered.includes("econnreset") || lowered.includes("econnrefused") || lowered.includes("socket hang up");

    if (isAbort) {
      return emptyProperty(
        normalized,
        "error",
        "Zillow took too long to respond (30s timeout). The RapidAPI host may be slow or cold-starting — retry in a moment.",
        "timeout"
      );
    }
    if (isDns) {
      return emptyProperty(
        normalized,
        "error",
        "Couldn't resolve the RapidAPI host. This usually means the Zillow scraper host name changed or your network can't reach RapidAPI. Verify the host on your RapidAPI dashboard.",
        "connection_error"
      );
    }
    if (isReset) {
      return emptyProperty(
        normalized,
        "error",
        "RapidAPI dropped the connection. This is usually transient — retry the lookup.",
        "connection_error"
      );
    }

    return emptyProperty(
      normalized,
      "error",
      `Couldn't reach Zillow: ${message}. Verify the server has network access and that your RapidAPI subscription is active.`,
      "connection_error"
    );
  }
}

export async function fetchZillowProperties(addresses: string[]): Promise<ZillowProperty[]> {
  const cleaned = addresses.map((a) => a.trim()).filter((a) => a.length > 0);
  // Parallel — one slow/failed lookup never blocks the others.
  const settled = await Promise.allSettled(cleaned.map((a) => fetchZillowProperty(a)));
  return settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const message = s.reason instanceof Error ? s.reason.message : "Unknown error";
    console.error(`[zillow] parallel lookup rejected for "${cleaned[i]}":`, message);
    return emptyProperty(
      cleaned[i] ?? "",
      "error",
      `Lookup failed: ${message}`,
      "connection_error"
    );
  });
}

export async function fetchZillowPropertyByMlsId(
  mlsid: string,
  page: number = 1
): Promise<ZillowProperty> {
  const trimmed = mlsid.trim();
  const apiKey = hasUsableServerKey();
  const fallbackLabel = `MLS #${trimmed}`;

  if (!apiKey) {
    return emptyProperty(
      fallbackLabel,
      "error",
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server.",
      "missing_key"
    );
  }

  if (!trimmed) {
    return emptyProperty(fallbackLabel, "no_data", "MLS ID is empty.", "invalid_address");
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const url = `${ZILLOW_MLSID_URL}?mlsid=${encodeURIComponent(trimmed)}&page=${safePage}`;
  const label = `bymlsid "${trimmed}"`;
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
      console.warn(`[zillow] ${label} → HTTP ${res.status} after ${totalElapsed}ms`);
      if (res.status === 404) {
        return emptyProperty(
          fallbackLabel,
          "no_data",
          "No property found for that MLS ID. Double-check the number — MLS IDs vary by region and are not always indexed by Zillow.",
          "not_found"
        );
      }
      if (res.status === 401 || res.status === 403) {
        return emptyProperty(
          fallbackLabel,
          "error",
          "RapidAPI rejected the request — verify RAPIDAPI_KEY and your subscription to the Zillow Live Data Scraper host.",
          "unauthorized"
        );
      }
      if (res.status === 429) {
        return emptyProperty(
          fallbackLabel,
          "error",
          "RapidAPI rate limit hit. Try again in a moment.",
          "rate_limited"
        );
      }
      return emptyProperty(
        fallbackLabel,
        "error",
        `Zillow request failed (HTTP ${res.status}).`,
        "connection_error"
      );
    }

    const payload = (await res.json().catch(() => null)) as unknown;
    const raw = extractFirstRecord(payload);

    if (!raw || (raw.error && !raw.zpid)) {
      return emptyProperty(
        fallbackLabel,
        "no_data",
        "No matching property in Zillow for that MLS ID.",
        "not_found"
      );
    }

    return normalizeProperty(raw, fallbackLabel);
  } catch (err) {
    const totalElapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : "Network error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(`[zillow] ${label} failed after ${totalElapsed}ms:`, message);
    return emptyProperty(
      fallbackLabel,
      "error",
      isAbort
        ? "Zillow took too long to respond (timeout)."
        : `Couldn't reach Zillow: ${message}.`,
      isAbort ? "timeout" : "connection_error"
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
export async function fetchPropertyByAddress(address: string): Promise<ComparisonResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    return { kind: "error", address: trimmed, message: "Empty address" };
  }

  try {
    const res = await fetch(`/api/property-lookup?address=${encodeURIComponent(trimmed)}`, {
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
        message: property?.errorMessage || data.error || "Data unavailable — check your connection",
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
  addresses: string[]
): Promise<ComparisonResult[]> {
  const cleaned = addresses.map((a) => a.trim()).filter((a) => a.length > 0);
  const settled = await Promise.allSettled(cleaned.map((a) => fetchPropertyByAddress(a)));
  return settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    return {
      kind: "error" as const,
      address: cleaned[i] ?? "",
      message: "Data unavailable — check your connection",
    };
  });
}
