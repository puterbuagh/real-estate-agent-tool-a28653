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
// ---------------------------------------------------------------------------

let loaderPromise: Promise<typeof google> | null = null;
let cachedKey: string | null = null;

async function fetchApiKey(): Promise<string> {
  const res = await fetch("/api/google-api-key", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error(
      "No Google API key configured. Add one in your Profile or set GOOGLE_API_KEY in the deployment environment."
    );
  }
  if (res.status === 401) {
    throw new Error("Sign in to enable Google Places autocomplete.");
  }
  if (!res.ok) {
    throw new Error("Couldn't load Google API key.");
  }

  const data = (await res.json()) as { apiKey?: string; error?: string };
  if (!data?.apiKey) {
    throw new Error(data?.error || "No Google API key returned.");
  }
  return data.apiKey;
}

/**
 * Load the Google Maps JavaScript API (with the Places library) and return
 * the global `google` namespace. Memoized — subsequent calls reuse the
 * same Promise so the script is only injected once per page.
 *
 * Throws a descriptive Error if no key is available or the script fails
 * to load; callers should catch and render a friendly fallback.
 */
export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("loadGoogleMaps() can only be called in the browser.")
    );
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    const apiKey = cachedKey ?? (await fetchApiKey());
    cachedKey = apiKey;

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places"],
    });

    // Loader.load() resolves with the google namespace.
    const g = await loader.load();
    return g;
  })();

  // If the load fails, clear the cached promise so the next attempt can retry.
  loaderPromise.catch(() => {
    loaderPromise = null;
    cachedKey = null;
  });

  return loaderPromise;
}

/**
 * Convenience: load Maps and immediately return the `places` library.
 * Useful when a component only needs Autocomplete / PlacesService.
 */
export async function loadGooglePlaces(): Promise<typeof google.maps.places> {
  const g = await loadGoogleMaps();
  return g.maps.places;
}

/**
 * Reset the in-memory cache. Exposed mainly for tests and for the Profile
 * page when an agent saves a new personal API key — call this so the next
 * autocomplete mount picks up the new key instead of the old cached one.
 */
export function resetGoogleMapsLoader(): void {
  loaderPromise = null;
  cachedKey = null;
}
