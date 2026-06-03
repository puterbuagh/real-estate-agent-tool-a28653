import { Loader } from "@googlemaps/js-api-loader";

// ---------------------------------------------------------------------------
// Client-side Google Maps / Places loader for AgentDesk.
//
// The API key is read directly from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY at build
// time. There is no user-provided key flow and no server-side key endpoint —
// administrators configure the key once in the deployment environment.
//
// loadGoogleMaps() returns a tagged result object rather than throwing, so
// callers can render a friendly fallback UI for each failure mode.
// ---------------------------------------------------------------------------

export type GoogleMapsLoadResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; google: typeof google }
  | { status: "missing_key"; error: string }
  | { status: "error"; error: string };

export type GoogleMapsLoadStatus = GoogleMapsLoadResult["status"];

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

function isPlaceholderKey(key: string | undefined | null): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith("your-") ||
    lower === "changeme" ||
    lower === "placeholder" ||
    lower.includes("your-google")
  );
}

let loaderPromise: Promise<GoogleMapsLoadResult> | null = null;
let cachedResult: GoogleMapsLoadResult | null = null;

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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (isPlaceholderKey(apiKey)) {
      const msg =
        "Google Maps is not configured. Contact your administrator.";
      warn(msg);
      return { status: "missing_key", error: msg };
    }

    if (
      (window as unknown as { google?: typeof google }).google?.maps?.places
        ?.Autocomplete
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
        apiKey: apiKey as string,
        version: "weekly",
        libraries: ["places"],
      });

      const g = await loader.load();
      log(
        "Loader.load() resolved. places.Autocomplete =",
        Boolean(g?.maps?.places?.Autocomplete)
      );

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
      const msg =
        err instanceof Error ? err.message : "Failed to load Google Maps.";
      warn("Loader.load() failed:", msg);
      return { status: "error", error: msg };
    }
  })();

  loaderPromise
    .then((r) => {
      if (r.status !== "ready") {
        loaderPromise = null;
      }
    })
    .catch(() => {
      loaderPromise = null;
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
 * Reset the in-memory cache. Mostly useful for tests / HMR.
 */
export function resetGoogleMapsLoader(): void {
  log("resetting loader cache");
  loaderPromise = null;
  cachedResult = null;
}
