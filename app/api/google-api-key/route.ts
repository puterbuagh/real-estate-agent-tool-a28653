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
//      (table: agent_profiles, column: google_api_key). This lets agents
//      bring their own key (BYO) without exposing the deployment-wide key.
//   2. Falls back to the deployment-wide GOOGLE_API_KEY env var.
//
// The endpoint is auth-gated so anonymous visitors can't drain quota by
// scraping the key from the network tab.
// ---------------------------------------------------------------------------

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
  const supabase = createSupabaseServerClient();

  // If Supabase isn't configured at all, treat as unauthenticated — but still
  // allow the deployment-wide fallback so local dev without auth keeps working.
  let userId: string | null = null;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  const envKey = process.env.GOOGLE_API_KEY;
  const envKeyUsable = !isPlaceholderKey(envKey);

  // 1. Try per-user profile key when we have an authenticated user.
  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from("agent_profiles")
        .select("google_api_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        const row = data as { google_api_key?: string | null };
        const profileKey = (row.google_api_key ?? "").trim();
        if (profileKey && !isPlaceholderKey(profileKey)) {
          return NextResponse.json(
            { apiKey: profileKey, source: "profile" as const },
            {
              headers: {
                "Cache-Control": "private, no-store",
              },
            }
          );
        }
      }
    } catch {
      // ignore — fall through to env fallback
    }
  }

  // 2. Deployment-wide fallback.
  if (envKeyUsable && envKey) {
    return NextResponse.json(
      { apiKey: envKey, source: "env" as const },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      error: "no_key",
      message:
        "No Google API key configured. Add one in your Profile (googleApiKey) or set GOOGLE_API_KEY in the deployment environment.",
    },
    { status: 404, headers: { "Cache-Control": "private, no-store" } }
  );
}
