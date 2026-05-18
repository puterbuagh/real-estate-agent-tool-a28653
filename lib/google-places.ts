"use client";

import { Loader } from "@googlemaps/js-api-loader";

// ---------------------------------------------------------------------------
// Client-side Google Maps / Places loader for AgentDesk.
//
// We deliberately do NOT inline the API key into the browser bundle. Instead,
// the client calls /api/google-api-key (auth-gated), which returns the right
// key for the current agent (per-user profile key, or deployment-wide
// GOOGLE_API_KEY fallback). Once we have the key, we load the Maps JS API
// with the `places` library and cache the resulting `google` namespace as
// a singleton — repeated calls to loadGoogleMaps() are cheap and never
// re-inject the script tag.
//
// loadGoogleMaps() returns a tagged result object rather than throwing, so
// callers (AddressInputs) can render a friendly fallback UI for each failure
// mode (missing key, network error, script load error).
// ---------------------------------------------------------------------------

export type GoogleMapsLoadResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; google: typeof google }
  | { status: "missing_key"; error: string }
  | { status: "error"; error: string };

const DEBUG =
  typeof window !== "undefined" &&
  (window.localStorage?.getItem("agentdesk:debug:gmaps") === "1" ||
    process.env.NODE_ENV !== "production");

function log(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[gmaps]", ...args);
  }
}

function warn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn("[gmaps]", ...args);
}

let loaderPromise: Promise<GoogleMapsLoadResult> | null = null;
let cachedKey: string | null = null;
let cachedResult: GoogleMapsLoadResult | null = null;

async function fetchApiKey(): Promise<
  { ok: true; apiKey: string; source?: string } | { ok: false; status: "missing_key" | "error"; error: string }
> {
  log("fetching API key from /api/google-api-key…");
  let res: Response;
  try {
    res = await fetch("/api/google-api-key", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    warn("key fetch network error:", msg);
    return { ok: false, status: "error", error: `Network error fetching Google API key: ${msg}` };
  }

  log("key fetch response status:", res.status);

  if (res.status === 404) {
    return {
      ok: false,
      status: "missing_key",
      error:
        "No Google API key configured. Add one in your Profile or set GOOGLE_API_KEY in the deployment environment.",
    };
  }
  if (res.status === 401) {
    return {
      ok: false,
      status: "missing_key",
      error: "Sign in to enable Google Places autocomplete.",
    };
  }
  if (!res.ok) {
    return { ok: false, status: "error", error: `Couldn't load Google API key (HTTP ${res.status}).` };
  }

  let data: { apiKey?: string; source?: string; error?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "parse error";
    return { ok: false, status: "error", error: `Couldn't parse Google API key response: ${msg}` };
  }

  if (!data?.apiKey) {
    return {
      ok: false,
      status: "missing_key",
      error: data?.error || "No Google API key returned.",
    };
  }

  log("key fetch ok, source =", data.source ?? "unknown", "key length =", data.apiKey.length);
  return { ok: true, apiKey: data.apiKey, source: data.source };
}

/**
 * Load the Google Maps JavaScript API (with the Places library). Returns a
 * tagged result describing success or failure — never throws. Memoized.
 */
export function loadGoogleMaps(): Promise<GoogleMapsLoadResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      status: "error",
      error: "loadGoogleMaps() can only be called in the browser.",
    });
  }

  if (cachedResult && cachedResult.status === "ready") {
    log("returning cached ready result");
    return Promise.resolve(cachedResult);
  }

  if (loaderPromise) {
    log("returning in-flight loader promise");
    return loaderPromise;
  }

  loaderPromise = (async (): Promise<GoogleMapsLoadResult> => {
    log("starting loader…");

    let apiKey = cachedKey;
    if (!apiKey) {
      const keyResult = await fetchApiKey();
      if (!keyResult.ok) {
        warn("key fetch failed:", keyResult.error);
        const result: GoogleMapsLoadResult = {
          status: keyResult.status,
          error: keyResult.error,
        };
        cachedResult = null;
        return result;
      }
      apiKey = keyResult.apiKey;
      cachedKey = apiKey;
    }

    // If the global google.maps.places is already present (e.g. another loader
    // initialized it), just reuse it.
    if (
      typeof window !== "undefined" &&
      (window as unknown as { google?: typeof google }).google?.maps?.places?.Autocomplete
    ) {
      log("google.maps.places already present on window — reusing");
      const g = (window as unknown as { google: typeof google }).google;
      const result: GoogleMapsLoadResult = { status: "ready", google: g };
      cachedResult = result;
      return result;
    }

    try {
      log("instantiating Loader with places library…");
      const loader = new Loader({
        apiKey,
        version: "weekly",
        libraries: ["places"],
      });

      const g = await loader.load();
      log("Loader.load() resolved. places.Autocomplete =", Boolean(g?.maps?.places?.Autocomplete));

      if (!g?.maps?.places?.Autocomplete) {
        const msg =
          "Google Maps loaded but the Places library is missing. Ensure the 'Places API' is enabled for this key.";
        warn(msg);
        return { status: "error", error: msg };
      }

      const result: GoogleMapsLoadResult = { status: "ready", google: g };
      cachedResult = result;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load Google Maps.";
      warn("Loader.load() failed:", msg);
      return { status: "error", error: msg };
    }
  })();

  // If we ended in a non-ready state, clear the in-flight promise so the next
  // call can retry (e.g. after the agent saves a key on /profile).
  loaderPromise
    .then((r) => {
      if (r.status !== "ready") {
        loaderPromise = null;
        cachedKey = null;
      }
    })
    .catch(() => {
      loaderPromise = null;
      cachedKey = null;
    });

  return loaderPromise;
}

/**
 * Convenience: load Maps and immediately return the `places` library.
 */
export async function loadGooglePlaces(): Promise<typeof google.maps.places | null> {
  const result = await loadGoogleMaps();
  if (result.status !== "ready") return null;
  return result.google.maps.places;
}

/**
 * Reset the in-memory cache. Call this from the Profile page after an agent
 * saves a new personal API key so the next autocomplete mount picks it up.
 */
export function resetGoogleMapsLoader(): void {
  log("resetting loader cache");
  loaderPromise = null;
  cachedKey = null;
  cachedResult = null;
}
