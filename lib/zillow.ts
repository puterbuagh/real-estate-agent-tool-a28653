import type { ZillowProperty, ComparisonProperty, ComparisonResult, ZillowDiagnosticDetails } from "@/types";

// ---------------------------------------------------------------------------
// Zillow Live Data Scraper (RapidAPI)
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
  errorType?: ErrorType,
  diagnosticDetails?: ZillowDiagnosticDetails
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
    diagnosticDetails,
  };
}

function normalizeProperty(
  raw: Record<string, unknown>,
  fallbackAddress: string,
  diagnosticDetails?: ZillowDiagnosticDetails
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
    diagnosticDetails,
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

function normalizeAddressForMatching(addr: string): string {
  let normalized = addr.toLowerCase().trim();
  normalized = normalized.replace(/\b(apt|apartment|unit|suite|#)\s*[a-z0-9-]+\b/gi, "");
  normalized = normalized.replace(/[^a-z0-9\s]/g, " ");

  const directionals: Record<string, string> = {
    north: "n", south: "s", east: "e", west: "w",
    northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
  };
  for (const [full, abbr] of Object.entries(directionals)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbr);
  }

  const streetTypes: Record<string, string> = {
    street: "st", avenue: "ave", road: "rd", boulevard: "blvd",
    drive: "dr", court: "ct", circle: "cir", lane: "ln",
    place: "pl", terrace: "ter", parkway: "pkwy", highway: "hwy",
    trail: "trl",
  };
  for (const [full, abbr] of Object.entries(streetTypes)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbr);
  }

  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function scoreAddressMatch(
  inputAddr: string,
  resultAddr: string,
  inputLat: number,
  inputLng: number,
  resultLat: number | null,
  resultLng: number | null
): number {
  const normalizedInput = normalizeAddressForMatching(inputAddr);
  const normalizedResult = normalizeAddressForMatching(resultAddr);

  if (!normalizedInput || !normalizedResult) return 0;

  const inputTokens = normalizedInput.split(" ").filter(Boolean);
  const resultTokens = normalizedResult.split(" ").filter(Boolean);

  const inputStreetNum = inputTokens.find((t) => /^\d+$/.test(t)) ?? "";
  const resultStreetNum = resultTokens.find((t) => /^\d+$/.test(t)) ?? "";

  let streetNumScore = 0.5;
  if (inputStreetNum && resultStreetNum) {
    streetNumScore = inputStreetNum === resultStreetNum ? 1 : 0;
  }

  const inputSet = new Set(inputTokens);
  const resultSet = new Set(resultTokens);
  let intersection = 0;
  for (const t of inputSet) if (resultSet.has(t)) intersection++;
  const union = inputSet.size + resultSet.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  const maxLen = Math.max(normalizedInput.length, normalizedResult.length);
  const lev = levenshteinDistance(normalizedInput, normalizedResult);
  const levSim = maxLen > 0 ? 1 - lev / maxLen : 0;

  let geoSim = 0;
  if (
    resultLat !== null &&
    resultLng !== null &&
    Number.isFinite(resultLat) &&
    Number.isFinite(resultLng)
  ) {
    const meters = haversineMeters(inputLat, inputLng, resultLat, resultLng);
    geoSim = Math.exp(-meters / 500);
  }

  const score =
    streetNumScore * 0.45 +
    jaccard * 0.25 +
    geoSim * 0.2 +
    levSim * 0.1;

  return score;
}

function findBestMatch(
  results: Array<Record<string, unknown>>,
  inputAddress: string,
  lat: number,
  lng: number
): { match: Record<string, unknown> | null; bestScore: number } {
  if (!results || results.length === 0) {
    console.log(`[zillow findBestMatch] no results array provided`);
    return { match: null, bestScore: 0 };
  }

  console.log(
    `[zillow findBestMatch] CANDIDATES COUNT: ${results.length}`
  );
  console.log(
    `[zillow findBestMatch] input="${inputAddress}" at (${lat},${lng}), evaluating ${results.length} candidates`
  );

  const normalizedInput = normalizeAddressForMatching(inputAddress);
  const inputTokens = normalizedInput.split(" ").filter(Boolean);
  const inputStreetNumber = inputTokens.find((t) => /^\d+$/.test(t)) ?? "";

  type Scored = {
    raw: Record<string, unknown>;
    score: number;
    streetNumMatch: boolean;
  };

  const scored: Scored[] = results.map((r, idx) => {
    const addr = toStringOrNull(r.address) ?? "";
    const rLat = toNumber(r.latitude);
    const rLng = toNumber(r.longitude);
    const score = scoreAddressMatch(inputAddress, addr, lat, lng, rLat, rLng);

    const normalized = normalizeAddressForMatching(addr);
    const resultStreetNumber =
      normalized.split(" ").find((t) => /^\d+$/.test(t)) ?? "";
    const streetNumMatch =
      Boolean(inputStreetNumber) &&
      Boolean(resultStreetNumber) &&
      inputStreetNumber === resultStreetNumber;

    console.log(
      `[zillow findBestMatch] candidate[${idx}] addr="${addr}" score=${score.toFixed(3)} streetMatch=${streetNumMatch}`
    );

    return { raw: r, score, streetNumMatch };
  });

  const streetMatches = scored.filter((s) => s.streetNumMatch);

  if (streetMatches.length > 0) {
    streetMatches.sort((a, b) => b.score - a.score);
    const winner = streetMatches[0];
    console.log(
      `[zillow findBestMatch] BEST MATCH CONFIDENCE: ${winner.score.toFixed(3)}`
    );
    console.log(
      `[zillow findBestMatch] BEST MATCH ADDRESS: ${toStringOrNull(winner.raw.address) ?? "(none)"}`
    );
    console.log(
      `[zillow findBestMatch] WINNER via street# match: score=${winner.score.toFixed(3)}`
    );
    return { match: winner.raw, bestScore: winner.score };
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const MIN_CONFIDENCE = 0.45;

  if (!best || best.score < MIN_CONFIDENCE) {
    console.log(
      `[zillow findBestMatch] BEST MATCH CONFIDENCE: ${best?.score.toFixed(3) ?? "n/a"}`
    );
    console.log(
      `[zillow findBestMatch] BEST MATCH ADDRESS: (no confident match)`
    );
    console.warn(
      `[zillow findBestMatch] NO CONFIDENT MATCH. best score=${best?.score.toFixed(3) ?? "n/a"}`
    );
    return { match: null, bestScore: best?.score ?? 0 };
  }

  console.log(
    `[zillow findBestMatch] BEST MATCH CONFIDENCE: ${best.score.toFixed(3)}`
  );
  console.log(
    `[zillow findBestMatch] BEST MATCH ADDRESS: ${toStringOrNull(best.raw.address) ?? "(none)"}`
  );

  return { match: best.raw, bestScore: best.score };
}

export async function fetchPropertyByCoordinates(
  address: string,
  latitude: number,
  longitude: number
): Promise<ZillowProperty> {
  const apiKey = hasUsableServerKey();

  const baseDiagnostics: ZillowDiagnosticDetails = {
    coordinatesUsed: { lat: latitude, lng: longitude },
  };

  console.log(
    `[zillow fetchPropertyByCoordinates] RAPIDAPI KEY EXISTS: ${!!apiKey}`
  );

  if (!apiKey) {
    return emptyProperty(
      address,
      "error",
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      "missing_key",
      baseDiagnostics
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return emptyProperty(
      address,
      "no_data",
      "Invalid coordinates provided.",
      "invalid_address",
      baseDiagnostics
    );
  }

  console.log(
    `[zillow fetchPropertyByCoordinates] START: address="${address}" lat=${latitude} lng=${longitude}`
  );

  const url = `${ZILLOW_BYCOORDINATES_URL}?lat=${latitude}&lng=${longitude}&page=1`;
  console.log(
    `[zillow fetchPropertyByCoordinates] RAPIDAPI URL: ${url}`
  );

  const label = `bycoordinates "${address}" (${latitude},${longitude})`;
  const start = Date.now();

  try {
    const res = await fetchWithRetry(
      url,
      { method: "GET", headers: rapidApiHeaders(apiKey), cache: "no-store" },
      label
    );
    const totalElapsed = Date.now() - start;

    console.log(
      `[zillow fetchPropertyByCoordinates] RapidAPI response: status=${res.status} elapsed=${totalElapsed}ms`
    );

    if (!res.ok) {
      let bodySnippet = "";
      try {
        const text = await res.text();
        bodySnippet = text.slice(0, 200);
        console.warn(
          `[zillow fetchPropertyByCoordinates] HTTP ${res.status} body snippet: ${bodySnippet}`
        );
      } catch {
        /* ignore */
      }

      if (res.status === 404) {
        return emptyProperty(
          address,
          "no_data",
          "Zillow has no record of this property. Try a different address or verify the property exists on zillow.com.",
          "not_found",
          baseDiagnostics
        );
      }
      if (res.status === 401 || res.status === 403) {
        return emptyProperty(
          address,
          "error",
          "RapidAPI rejected the request (401/403). Verify your RAPIDAPI_KEY is active and that your account is subscribed to the 'Zillow.com Live Data Scraper' host.",
          "unauthorized",
          baseDiagnostics
        );
      }
      if (res.status === 429) {
        return emptyProperty(
          address,
          "error",
          "RapidAPI rate limit hit (429). Wait a moment and retry, or upgrade your RapidAPI subscription tier.",
          "rate_limited",
          baseDiagnostics
        );
      }
      return emptyProperty(
        address,
        "error",
        `Zillow upstream returned HTTP ${res.status}. This is usually a temporary RapidAPI/Zillow outage — try again in a minute.`,
        "connection_error",
        baseDiagnostics
      );
    }

    const payload = (await res.json().catch(() => null)) as unknown;
    console.log(
      `[zillow fetchPropertyByCoordinates] ZILLOW RAW RESPONSE: ${JSON.stringify(payload).slice(0, 500)}`
    );

    if (!payload || typeof payload !== "object") {
      return emptyProperty(
        address,
        "error",
        "Invalid response from Zillow API.",
        "unknown",
        baseDiagnostics
      );
    }

    const payloadObj = payload as Record<string, unknown>;
    const results = Array.isArray(payloadObj.results)
      ? (payloadObj.results as Array<Record<string, unknown>>)
      : [];

    const diagnosticsWithCount: ZillowDiagnosticDetails = {
      ...baseDiagnostics,
      candidatesReturned: results.length,
    };

    console.log(
      `[zillow fetchPropertyByCoordinates] RapidAPI returned ${results.length} results`
    );

    if (results.length === 0) {
      return emptyProperty(
        address,
        "no_data",
        "No properties found near these coordinates. The property may not be listed on Zillow or the coordinates may be incorrect.",
        "not_found",
        diagnosticsWithCount
      );
    }

    const { match: bestMatch, bestScore } = findBestMatch(
      results,
      address,
      latitude,
      longitude
    );

    const fullDiagnostics: ZillowDiagnosticDetails = {
      ...diagnosticsWithCount,
      bestConfidenceScore: bestScore,
    };

    if (!bestMatch) {
      return emptyProperty(
        address,
        "no_data",
        "Zillow returned nearby properties but none matched this address with enough confidence. Try verifying the address on zillow.com or pick a more specific suggestion from the dropdown.",
        "not_found",
        fullDiagnostics
      );
    }

    const normalized = normalizeProperty(bestMatch, address, fullDiagnostics);
    console.log(
      `[zillow fetchPropertyByCoordinates] SUCCESS: zpid=${normalized.zpid} (${totalElapsed}ms)`
    );
    return normalized;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(
      `[zillow fetchPropertyByCoordinates] EXCEPTION: ${message}`,
      err
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
        "timeout",
        baseDiagnostics
      );
    }
    if (isDns) {
      return emptyProperty(
        address,
        "error",
        "Couldn't resolve the RapidAPI host. This usually means the Zillow scraper host name changed or your network can't reach RapidAPI.",
        "connection_error",
        baseDiagnostics
      );
    }
    if (isReset) {
      return emptyProperty(
        address,
        "error",
        "RapidAPI dropped the connection. This is usually transient — retry the lookup.",
        "connection_error",
        baseDiagnostics
      );
    }

    return emptyProperty(
      address,
      "error",
      `Couldn't reach Zillow: ${message}. Verify the server has network access and that your RapidAPI subscription is active.`,
      "connection_error",
      baseDiagnostics
    );
  }
}

export const fetchZillowPropertyByCoordinates = fetchPropertyByCoordinates;

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
        errorType: "missing_key",
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
        errorType: property?.errorType,
        diagnosticDetails: property?.diagnosticDetails,
      };
    }

    if (property.status === "no_data") {
      return {
        kind: "empty",
        address: trimmed,
        diagnosticDetails: property.diagnosticDetails,
      };
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
