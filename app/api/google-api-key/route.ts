import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------------------------------------------------------------------
// GET /api/google-api-key
//
// Returns the Google Maps / Places API key to use for the currently
// authenticated agent. Resolution order:
//   1. The agent's per-user `googleApiKey` stored on their profile row
//      (table: agent_profiles, column: google_api_key). BYO key.
//   2. Falls back to the deployment-wide GOOGLE_API_KEY env var.
//
// Auth-gated for the profile lookup, but the env fallback is allowed even
// without a session so local dev / public demo deploys keep working.
// ---------------------------------------------------------------------------

const DEBUG = process.env.NODE_ENV !== "production";

function log(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[google-api-key]", ...args);
  }
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

export async function GET() {
  log("GET request received");
  const supabase = createSupabaseServerClient();

  let userId: string | null = null;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      log("auth user resolved:", userId ? `user:${userId.slice(0, 8)}…` : "anonymous");
    } catch (err) {
      log("auth.getUser() failed:", err instanceof Error ? err.message : err);
      userId = null;
    }
  } else {
    log("supabase server client not configured");
  }

  const envKey = process.env.GOOGLE_API_KEY;
  const envKeyUsable = !isPlaceholderKey(envKey);
  log("env GOOGLE_API_KEY present:", Boolean(envKey), "usable:", envKeyUsable);

  // 1. Try per-user profile key when we have an authenticated user.
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("agent_profiles")
        .select("google_api_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        log("agent_profiles lookup error:", error.message);
      } else if (data) {
        const row = data as { google_api_key?: string | null };
        const profileKey = (row.google_api_key ?? "").trim();
        log("profile key present:", Boolean(profileKey), "length:", profileKey.length);
        if (profileKey && !isPlaceholderKey(profileKey)) {
          log("returning profile key");
          return NextResponse.json(
            { apiKey: profileKey, source: "profile" as const },
            { headers: { "Cache-Control": "private, no-store" } }
          );
        }
      }
    } catch (err) {
      log("profile lookup threw:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Deployment-wide fallback.
  if (envKeyUsable && envKey) {
    log("returning env key");
    return NextResponse.json(
      { apiKey: envKey, source: "env" as const },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  log("no usable key found — returning 404");
  return NextResponse.json(
    {
      error: "no_key",
      message:
        "No Google API key configured. Add one in your Profile (googleApiKey) or set GOOGLE_API_KEY in the deployment environment.",
    },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
}
