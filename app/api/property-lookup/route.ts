import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchZillowProperties,
  fetchZillowProperty,
  fetchZillowPropertyByMlsId,
} from "@/lib/zillow";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Vercel default is 10s — Zillow lookups + retries can exceed that on cold
// starts. Bumping to 60s gives the upstream room to respond.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Per-user in-memory rate limiter (sliding window).
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): {
  ok: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const prior = rateBuckets.get(userId) ?? [];
  const recent = prior.filter((t) => t > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldest));
    return { ok: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  rateBuckets.set(userId, recent);

  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      const filtered = v.filter((t) => t > cutoff);
      if (filtered.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, filtered);
    }
  }

  return { ok: true, retryAfterSec: 0 };
}

async function requireUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: true, userId: "anonymous" };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: true, userId: "anonymous" };
    }

    return { ok: true, userId: user.id };
  } catch {
    return { ok: true, userId: "anonymous" };
  }
}

function enforceRateLimit(userId: string): NextResponse | null {
  const rl = checkRateLimit(userId);
  if (rl.ok) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "rate_limited",
      errorType: "rate_limited",
      message: `Too many requests. Try again in ${rl.retryAfterSec}s.`,
      retryAfter: rl.retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    }
  );
}

function hasUsableKey(): boolean {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().includes("your-")) return false;
  if (trimmed.toLowerCase().includes("placeholder")) return false;
  if (trimmed.length < 20) return false;
  return true;
}

function missingKeyResponse() {
  console.warn("[property-lookup] RAPIDAPI_KEY missing or placeholder");
  return NextResponse.json({
    ok: false,
    status: "error",
    error: "missing_key",
    errorType: "missing_key",
    message:
      "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables and redeploy. See .env.example for setup steps.",
  });
}

/** Sanitize address/mlsid for logs — avoids leaking PII in serverless logs. */
function sanitizeForLog(input: string | null | undefined, max = 60): string {
  if (!input) return "-";
  const trimmed = String(input).trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limited = enforceRateLimit(auth.userId);
  if (limited) return limited;

  const mlsid = req.nextUrl.searchParams.get("mlsid");
  const address = req.nextUrl.searchParams.get("address");
  const pageParam = req.nextUrl.searchParams.get("page");

  console.log(
    `[property-lookup GET] mlsid=${sanitizeForLog(mlsid)} address=${sanitizeForLog(address)} user=${auth.userId}`
  );

  if (!mlsid?.trim() && !address?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_param",
        errorType: "invalid_address",
        message: "Provide an 'address' or 'mlsid' query parameter.",
      },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return missingKeyResponse();
  }

  try {
    const property = mlsid?.trim()
      ? await fetchZillowPropertyByMlsId(
          mlsid.trim(),
          pageParam ? Number(pageParam) : 1
        )
      : await fetchZillowProperty((address as string).trim());

    const elapsed = Date.now() - startedAt;
    console.log(
      `[property-lookup GET] done in ${elapsed}ms status=${property.status}${property.errorType ? ` (${property.errorType})` : ""}`
    );

    if (property.status === "ok") {
      return NextResponse.json({ ok: true, property });
    }
    if (property.status === "no_data") {
      return NextResponse.json({
        ok: false,
        status: "no_data",
        property,
        error: property.errorMessage ?? "No data found for this lookup",
        errorType: property.errorType ?? "not_found",
      });
    }
    return NextResponse.json({
      ok: false,
      status: "error",
      property,
      error: property.errorMessage ?? "Data unavailable",
      errorType: property.errorType ?? "unknown",
    });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(`[property-lookup GET] threw after ${elapsed}ms:`, message);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: message,
        errorType: "connection_error",
        message: `Lookup failed unexpectedly: ${message}. Retry in a moment — this is usually transient.`,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limited = enforceRateLimit(auth.userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        errorType: "invalid_address",
        message: "Request body must be valid JSON.",
      },
      { status: 400 }
    );
  }

  const bodyObj = (body ?? {}) as {
    addresses?: unknown;
    mlsid?: unknown;
    page?: unknown;
  };

  // MLS ID single-lookup path
  const mlsidRaw = bodyObj.mlsid;
  if (typeof mlsidRaw === "string" && mlsidRaw.trim().length > 0) {
    if (!hasUsableKey()) return missingKeyResponse();
    const page =
      typeof bodyObj.page === "number"
        ? bodyObj.page
        : typeof bodyObj.page === "string"
        ? Number(bodyObj.page)
        : 1;
    try {
      console.log(
        `[property-lookup POST mlsid] mlsid=${sanitizeForLog(mlsidRaw)} user=${auth.userId}`
      );
      const property = await fetchZillowPropertyByMlsId(mlsidRaw.trim(), page);
      const elapsed = Date.now() - startedAt;
      console.log(
        `[property-lookup POST mlsid] done in ${elapsed}ms status=${property.status}`
      );
      if (property.status === "ok") {
        return NextResponse.json({ ok: true, property });
      }
      if (property.status === "no_data") {
        return NextResponse.json({
          ok: false,
          status: "no_data",
          property,
          error: property.errorMessage ?? "No data found for this MLS ID",
          errorType: property.errorType ?? "not_found",
        });
      }
      return NextResponse.json({
        ok: false,
        status: "error",
        property,
        error: property.errorMessage ?? "Data unavailable",
        errorType: property.errorType ?? "unknown",
      });
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : "Lookup failed";
      console.error(`[property-lookup POST mlsid] threw after ${elapsed}ms:`, message);
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          error: message,
          errorType: "connection_error",
          message: `MLS lookup failed: ${message}. Retry in a moment.`,
        },
        { status: 200 }
      );
    }
  }

  // Address batch-lookup path
  const raw = bodyObj.addresses;
  const addresses = Array.isArray(raw)
    ? (raw as unknown[]).map((v) => String(v))
    : [];

  if (addresses.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_param",
        errorType: "invalid_address",
        message:
          "Provide a non-empty addresses[] array or an 'mlsid' string in the request body.",
      },
      { status: 400 }
    );
  }

  if (addresses.length > 5) {
    return NextResponse.json(
      {
        ok: false,
        error: "too_many",
        errorType: "invalid_address",
        message: "Maximum of 5 addresses per request.",
      },
      { status: 400 }
    );
  }

  if (!hasUsableKey()) {
    return NextResponse.json({
      ok: false,
      error: "missing_key",
      errorType: "missing_key",
      message:
        "Property lookup unavailable — RAPIDAPI_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      properties: [],
    });
  }

  try {
    console.log(
      `[property-lookup POST] batch=${addresses.length} user=${auth.userId} samples=[${addresses.slice(0, 3).map((a) => sanitizeForLog(a, 40)).join(" | ")}${addresses.length > 3 ? " | …" : ""}]`
    );
    const properties = await fetchZillowProperties(addresses);
    const okCount = properties.filter((p) => p.status === "ok").length;
    const errCount = properties.filter((p) => p.status === "error").length;
    const noDataCount = properties.filter((p) => p.status === "no_data").length;
    const elapsed = Date.now() - startedAt;
    console.log(
      `[property-lookup POST] result in ${elapsed}ms ok=${okCount} no_data=${noDataCount} error=${errCount}`
    );
    return NextResponse.json({ ok: true, properties });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Lookup failed";
    console.error(`[property-lookup POST batch] threw after ${elapsed}ms:`, message);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        errorType: "connection_error",
        message: `Batch lookup failed: ${message}. Retry in a moment — this is usually transient.`,
        properties: [],
      },
      { status: 200 }
    );
  }
}
