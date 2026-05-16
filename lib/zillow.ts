import type { ZillowProperty, ComparisonProperty, ComparisonResult } from "@/types";

const ZILLOW_HOST = "zillow-com1.p.rapidapi.com";
const ZILLOW_URL = `https://${ZILLOW_HOST}/property`;

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

export async function fetchZillowProperty(address: string): Promise<ZillowProperty> {
  const trimmed = address.trim();
  const apiKey = process.env.RAPIDAPI_KEY;

  const empty = (status: "no_data" | "error", errorMessage?: string): ZillowProperty => ({
    zpid: null,
    address: trimmed,
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
  });

  if (!apiKey) {
    return empty("error", "Missing RapidAPI key (RAPIDAPI_KEY).");
  }

  try {
    const url = `${ZILLOW_URL}?address=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": ZILLOW_HOST,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return empty("no_data");
      return empty("error", `Zillow request failed (${res.status})`);
    }

    const raw = (await res.json()) as Record<string, unknown>;

    if (!raw || (raw.error && !raw.zpid)) {
      return empty("no_data");
    }

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
      address: formattedAddress(raw, trimmed),
      price,
      zestimate,
      bedrooms: toNumber(raw.bedrooms),
      bathrooms: toNumber(raw.bathrooms),
      livingArea,
      lotSize: (raw.lotSize as number | string | undefined) ?? (raw.lotAreaValue as number | string | undefined) ?? null,
      yearBuilt: toNumber(raw.yearBuilt),
      propertyType: toStringOrNull(raw.propertyTypeDimension ?? raw.homeType ?? raw.propertyType),
      daysOnMarket: toNumber(raw.daysOnZillow ?? raw.daysOnMarket),
      pricePerSqft,
      lastSoldPrice: toNumber(raw.lastSoldPrice),
      lastSoldDate: toStringOrNull(raw.dateSold ?? raw.lastSoldDate),
      taxAssessedValue: toNumber(raw.taxAssessedValue),
      photo: firstPhoto(raw),
      status: "ok",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return empty("error", message);
  }
}

export async function fetchZillowProperties(addresses: string[]): Promise<ZillowProperty[]> {
  const cleaned = addresses.map((a) => a.trim()).filter((a) => a.length > 0);
  return Promise.all(cleaned.map((a) => fetchZillowProperty(a)));
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

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { property?: ZillowProperty; error?: string }
        | null;
      const fallbackProperty = payload?.property;
      if (fallbackProperty?.status === "no_data") {
        return { kind: "empty", address: trimmed };
      }
      return {
        kind: "error",
        address: trimmed,
        message:
          fallbackProperty?.errorMessage ||
          payload?.error ||
          "Data unavailable — check your connection",
      };
    }

    const data = (await res.json()) as {
      ok?: boolean;
      property?: ZillowProperty;
      error?: string;
    };
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
