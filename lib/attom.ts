import type { ZillowProperty, ZillowDiagnosticDetails } from "@/types";

// ATTOM API base URL — extracted as a constant for maintainability.
// If ATTOM changes their base URL, update this single value.
const ATTOM_BASE_URL = "https://api.gateway.attomdata.com";
const ATTOM_PROPERTY_DETAIL = `${ATTOM_BASE_URL}/propertyapi/v1.0.0/property/detail`;
const ATTOM_PROPERTY_BASIC = `${ATTOM_BASE_URL}/propertyapi/v1.0.0/property/basicprofile`;
const ATTOM_AVM_DETAIL = `${ATTOM_BASE_URL}/propertyapi/v1.0.0/attomavm/detail`;
const ATTOM_SALES_HISTORY = `${ATTOM_BASE_URL}/propertyapi/v1.0.0/saleshistory/detail`;

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function hasUsableAttomKey(): string | null {
  const key = process.env.ATTOM_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().includes("your-")) return null;
  if (trimmed.toLowerCase().includes("placeholder")) return null;
  if (trimmed.length < 20) return null;
  return trimmed;
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

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
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
          `[attom] ${label} attempt ${attempt + 1} got ${res.status} after ${elapsed}ms, retrying in ${backoff}ms`
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      if (attempt > 0) {
        console.log(
          `[attom] ${label} attempt ${attempt + 1} succeeded after ${elapsed}ms`
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
        `[attom] ${label} attempt ${attempt + 1} ${isAbort ? "timed out" : "threw"} after ${elapsed}ms (${errName}): ${errMsg}`
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

async function callAttomEndpoint(
  url: string,
  apiKey: string,
  label: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null; errorType?: ErrorType; errorMessage?: string }> {
  try {
    const res = await fetchWithRetry(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: apiKey,
        },
        cache: "no-store",
      },
      label
    );

    if (!res.ok) {
      let bodySnippet = "";
      try {
        const text = await res.text();
        bodySnippet = text.slice(0, 200);
      } catch {
        /* ignore */
      }
      console.warn(`[attom] ${label} HTTP ${res.status}: ${bodySnippet}`);

      if (res.status === 404) {
        return { ok: false, status: res.status, data: null, errorType: "not_found", errorMessage: "Not found in ATTOM" };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, data: null, errorType: "unauthorized", errorMessage: "ATTOM rejected the API key" };
      }
      if (res.status === 429) {
        return { ok: false, status: res.status, data: null, errorType: "rate_limited", errorMessage: "ATTOM rate limit hit" };
      }
      return { ok: false, status: res.status, data: null, errorType: "connection_error", errorMessage: `HTTP ${res.status}` };
    }

    const payload = (await res.json().catch(() => null)) as unknown;
    if (!payload || typeof payload !== "object") {
      return { ok: false, status: res.status, data: null, errorType: "unknown", errorMessage: "Invalid JSON" };
    }

    const payloadObj = payload as Record<string, unknown>;
    const status = (payloadObj.status ?? {}) as Record<string, unknown>;
    const statusCode = toNumber(status.code);
    const statusMsg = toStringOrNull(status.msg);

    if (statusCode !== 0 && statusCode !== null) {
      // ATTOM uses non-zero codes for "no data found" — treat as soft miss
      return {
        ok: false,
        status: res.status,
        data: payloadObj,
        errorType: "not_found",
        errorMessage: statusMsg || "ATTOM returned no data",
      };
    }

    return { ok: true, status: res.status, data: payloadObj };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = err instanceof Error ? err.message : "Network error";
    console.error(`[attom] ${label} exception: ${message}`);
    return {
      ok: false,
      status: 0,
      data: null,
      errorType: isAbort ? "timeout" : "connection_error",
      errorMessage: message,
    };
  }
}

function extractFirstProperty(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;
  const properties = payload.property;
  if (Array.isArray(properties) && properties.length > 0) {
    const first = properties[0];
    if (first && typeof first === "object") return first as Record<string, unknown>;
  }
  return null;
}

function mergePropertyData(
  fallbackAddress: string,
  propertyDetail: Record<string, unknown> | null,
  avmData: Record<string, unknown> | null,
  salesHistory: Record<string, unknown> | null,
  diagnosticDetails: ZillowDiagnosticDetails
): ZillowProperty {
  const source = propertyDetail ?? avmData ?? salesHistory ?? {};

  const address = (getNested(source, ["address"]) ?? {}) as Record<string, unknown>;
  const building = (getNested(source, ["building"]) ?? {}) as Record<string, unknown>;
  const rooms = (getNested(building, ["rooms"]) ?? {}) as Record<string, unknown>;
  const size = (getNested(building, ["size"]) ?? {}) as Record<string, unknown>;
  const summary = (getNested(building, ["summary"]) ?? {}) as Record<string, unknown>;
  const lot = (getNested(source, ["lot"]) ?? {}) as Record<string, unknown>;
  const propSummary = (getNested(source, ["summary"]) ?? {}) as Record<string, unknown>;
  const identifier = (getNested(source, ["identifier"]) ?? {}) as Record<string, unknown>;
  const assessment = (getNested(source, ["assessment"]) ?? {}) as Record<string, unknown>;
  const assessed = (getNested(assessment, ["assessed"]) ?? {}) as Record<string, unknown>;
  const market = (getNested(assessment, ["market"]) ?? {}) as Record<string, unknown>;

  // AVM value — pulled from avm endpoint if available, else fall back to market value
  const avmProp = extractFirstProperty(avmData);
  const avmValue =
    toNumber(getNested(avmProp, ["avm", "amount", "value"])) ??
    toNumber(getNested(avmProp, ["avm", "amount", "avmvalue"])) ??
    null;

  const marketValue = toNumber(market.mktttlvalue);
  const taxAssessedValue = toNumber(assessed.assdttlvalue);

  // Pull last sale from sales history endpoint if present
  let lastSoldPrice: number | null = null;
  let lastSoldDate: string | null = null;

  const salesProp = extractFirstProperty(salesHistory);
  if (salesProp) {
    const saleHistoryArr = getNested(salesProp, ["salehistory"]);
    if (Array.isArray(saleHistoryArr) && saleHistoryArr.length > 0) {
      // Find most recent sale with an amount
      const sorted = [...saleHistoryArr]
        .filter((s) => s && typeof s === "object")
        .map((s) => s as Record<string, unknown>)
        .filter((s) => toNumber(getNested(s, ["amount", "saleamt"])))
        .sort((a, b) => {
          const dA = toStringOrNull(getNested(a, ["amount", "salerecdate"])) ?? "";
          const dB = toStringOrNull(getNested(b, ["amount", "salerecdate"])) ?? "";
          return dB.localeCompare(dA);
        });
      if (sorted.length > 0) {
        lastSoldPrice = toNumber(getNested(sorted[0], ["amount", "saleamt"]));
        lastSoldDate = toStringOrNull(getNested(sorted[0], ["amount", "salerecdate"]));
      }
    }
  }

  // Fall back to inline sale data on property detail
  if (lastSoldPrice === null) {
    const inlineSale = getNested(source, ["sale"]);
    if (inlineSale && typeof inlineSale === "object") {
      lastSoldPrice = toNumber(getNested(inlineSale, ["amount", "saleamt"]));
      lastSoldDate = toStringOrNull(getNested(inlineSale, ["amount", "salerecdate"]));
    }
  }

  const beds = toNumber(rooms.beds);
  const baths = toNumber(rooms.bathstotal);
  const livingArea = toNumber(size.livingsize) ?? toNumber(size.universalsize);
  const lotSize = toNumber(lot.lotsize1) ?? toNumber(lot.lotsize2);
  const yearBuilt = toNumber(summary.yearbuilt);
  const propertyType = toStringOrNull(propSummary.proptype) ?? toStringOrNull(propSummary.propclass);

  // Price priority: AVM > market value > last sold
  const price = avmValue ?? marketValue ?? lastSoldPrice;

  const pricePerSqft =
    price && livingArea && livingArea > 0 ? Math.round(price / livingArea) : null;

  const fullAddress =
    [
      toStringOrNull(address.line1),
      toStringOrNull(address.line2),
      toStringOrNull(address.locality),
      toStringOrNull(address.countrySubd),
      toStringOrNull(address.postal1),
    ]
      .filter(Boolean)
      .join(", ") || fallbackAddress;

  const attomId =
    toStringOrNull(identifier.attomId) ??
    toStringOrNull(identifier.Id) ??
    toStringOrNull(identifier.obPropId);

  return {
    zpid: attomId,
    address: fullAddress,
    price,
    zestimate: avmValue ?? marketValue,
    bedrooms: beds,
    bathrooms: baths,
    livingArea,
    lotSize,
    yearBuilt,
    propertyType,
    daysOnMarket: null,
    pricePerSqft,
    lastSoldPrice,
    lastSoldDate,
    taxAssessedValue,
    photo: null,
    status: "ok",
    diagnosticDetails,
  };
}

export async function fetchPropertyByAddress(
  address: string,
  latitude: number,
  longitude: number
): Promise<ZillowProperty> {
  const apiKey = hasUsableAttomKey();

  const baseDiagnostics: ZillowDiagnosticDetails = {
    coordinatesUsed: { lat: latitude, lng: longitude },
  };

  console.log(`[attom fetchPropertyByAddress] ATTOM API KEY EXISTS: ${!!apiKey}`);

  if (!apiKey) {
    return emptyProperty(
      address,
      "error",
      "Property lookup unavailable — ATTOM_API_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      "missing_key",
      baseDiagnostics
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return emptyProperty(address, "no_data", "Invalid coordinates provided.", "invalid_address", baseDiagnostics);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return emptyProperty(address, "no_data", "Coordinates out of valid range.", "invalid_address", baseDiagnostics);
  }

  console.log(
    `[attom fetchPropertyByAddress] START: address="${address}" lat=${latitude} lng=${longitude}`
  );

  // Build address1/address2 for ATTOM address-based endpoints.
  // ATTOM expects: address1="123 Main St", address2="City, ST ZIP"
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const address1 = parts[0] ?? address;
  const address2 = parts.slice(1).join(", ");

  const useAddressParams = Boolean(address1 && address2);
  const addressQuery = useAddressParams
    ? `address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`
    : null;
  const coordQuery = `latitude=${latitude}&longitude=${longitude}`;

  const start = Date.now();

  // 1. Property detail — try address params first (more reliable), fall back to coords via basicprofile
  let propertyResult = addressQuery
    ? await callAttomEndpoint(
        `${ATTOM_PROPERTY_DETAIL}?${addressQuery}`,
        apiKey,
        `property/detail "${address1}"`
      )
    : { ok: false, status: 0, data: null, errorType: "not_found" as ErrorType, errorMessage: "no address parts" };

  if (!propertyResult.ok) {
    console.log(
      `[attom fetchPropertyByAddress] property/detail miss (${propertyResult.errorType}), falling back to basicprofile by coords`
    );
    propertyResult = await callAttomEndpoint(
      `${ATTOM_PROPERTY_BASIC}?${coordQuery}`,
      apiKey,
      `property/basicprofile (${latitude},${longitude})`
    );
  }

  if (!propertyResult.ok) {
    const errType = propertyResult.errorType ?? "unknown";
    const message =
      errType === "not_found"
        ? "ATTOM has no record of this property. The address may not exist in the ATTOM database, or the coordinates may not align with a parcel."
        : errType === "unauthorized"
        ? "ATTOM API rejected the request (401/403). Verify your ATTOM_API_KEY is active and has access to the Property API."
        : errType === "rate_limited"
        ? "ATTOM API rate limit hit (429). Wait a moment and retry, or check your API quota."
        : errType === "timeout"
        ? "ATTOM API took too long to respond (30s timeout). Retry in a moment."
        : `Couldn't reach ATTOM API: ${propertyResult.errorMessage ?? "unknown error"}. Verify the server has network access and that your ATTOM_API_KEY is active.`;
    return emptyProperty(
      address,
      errType === "not_found" ? "no_data" : "error",
      message,
      errType,
      baseDiagnostics
    );
  }

  const propertyDetail = extractFirstProperty(propertyResult.data);
  if (!propertyDetail) {
    return emptyProperty(
      address,
      "no_data",
      "ATTOM returned an empty property list for this address.",
      "not_found",
      baseDiagnostics
    );
  }

  // 2 & 3. AVM + sales history — fired in parallel, both optional
  const [avmResult, salesResult] = await Promise.all([
    callAttomEndpoint(
      addressQuery
        ? `${ATTOM_AVM_DETAIL}?${addressQuery}`
        : `${ATTOM_AVM_DETAIL}?${coordQuery}`,
      apiKey,
      `attomavm/detail "${address1}"`
    ),
    callAttomEndpoint(
      addressQuery
        ? `${ATTOM_SALES_HISTORY}?${addressQuery}`
        : `${ATTOM_SALES_HISTORY}?${coordQuery}`,
      apiKey,
      `saleshistory/detail "${address1}"`
    ),
  ]);

  if (!avmResult.ok) {
    console.log(`[attom] AVM miss (${avmResult.errorType}): ${avmResult.errorMessage ?? ""}`);
  }
  if (!salesResult.ok) {
    console.log(`[attom] sales history miss (${salesResult.errorType}): ${salesResult.errorMessage ?? ""}`);
  }

  const merged = mergePropertyData(
    address,
    propertyDetail,
    avmResult.ok ? avmResult.data : null,
    salesResult.ok ? salesResult.data : null,
    baseDiagnostics
  );

  const totalElapsed = Date.now() - start;
  console.log(
    `[attom fetchPropertyByAddress] SUCCESS: attomId=${merged.zpid} price=${merged.price} avm=${avmResult.ok} sales=${salesResult.ok} (${totalElapsed}ms)`
  );

  return merged;
}
