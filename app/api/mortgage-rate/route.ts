import { NextResponse } from "next/server";
import { fetchMortgageRates } from "@/lib/fred";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Per-user sliding-window in-memory rate limiter.
// Minimal-scope guard against quota drain on the FRED-backed endpoint.
// For multi-instance deployments, swap for Upstash/Redis — same key (user.id).
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per user per window

const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateBuckets.get(userId) ?? [];
  const fresh = bucket.filter((t) => t > windowStart);

  if (fresh.length >= RATE_LIMIT_MAX) {
    const oldest = fresh[0];
    const retryAfterMs = Math.max(0, oldest + RATE_LIMIT_WINDOW_MS - now);
    rateBuckets.set(userId, fresh);
    return {
      ok: false,
      retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1,
      remaining: 0,
    };
  }

  fresh.push(now);
  rateBuckets.set(userId, fresh);

  // Opportunistic GC to keep the map bounded.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      const kept = v.filter((t) => t > windowStart);
      if (kept.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, kept);
    }
  }

  return {
    ok: true,
    retryAfterSec: 0,
    remaining: RATE_LIMIT_MAX - fresh.length,
  };
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith("your-") ||
    lower === "changeme" ||
    lower === "placeholder" ||
    lower.includes("your-fred")
  );
}

export async function GET() {
  // -------------------------------------------------------------------------
  // Auth gate — require a signed-in Supabase session (mirrors /api/property-lookup).
  // -------------------------------------------------------------------------
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "auth_unavailable", message: "Auth is not configured." },
      { status: 401 }
    );
  }

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message: "Sign in to access live mortgage rates.",
      },
      { status: 401 }
    );
  }

  // -------------------------------------------------------------------------
  // Per-user rate limit.
  // -------------------------------------------------------------------------
  const rl = checkRateLimit(userId);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: `Too many requests. Try again in ${rl.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSec),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const key = process.env.FRED_API_KEY;
  if (isPlaceholderKey(key)) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_key",
        message:
          "FRED API key not configured. Add FRED_API_KEY (server-only) to enable live rates.",
        data: {
          thirtyYear: { current: null, currentDate: null, history: [] },
          fifteenYear: { current: null, currentDate: null, history: [] },
          asOf: null,
        },
      },
      { status: 200 }
    );
  }

  try {
    const data = await fetchMortgageRates();
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          // Aggressive edge caching: authenticated repeat hits served from CDN,
          // minimizing FRED quota consumption. Vary on Cookie so per-user
          // 401s aren't cached as 200s for other users.
          "Cache-Control":
            "private, s-maxage=3600, stale-while-revalidate=86400",
          "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Vary": "Cookie",
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch mortgage rate";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        data: {
          thirtyYear: { current: null, currentDate: null, history: [] },
          fifteenYear: { current: null, currentDate: null, history: [] },
          asOf: null,
        },
      },
      { status: 200 }
    );
  }
}
