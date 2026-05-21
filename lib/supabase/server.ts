import { createServerClient as _createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function hasUsableConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const u = url.trim();
  const a = anon.trim();
  if (!u || !a) return null;
  if (u.toLowerCase().includes("your-") || u.toLowerCase().includes("placeholder")) return null;
  if (a.toLowerCase().includes("your-") || a.toLowerCase().includes("placeholder")) return null;
  if (!u.startsWith("http")) return null;
  return { url: u, anon: a };
}

function hasUsableServiceConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const u = url.trim();
  const k = key.trim();
  if (!u || !k) return null;
  if (u.toLowerCase().includes("your-") || u.toLowerCase().includes("placeholder")) return null;
  if (k.toLowerCase().includes("your-") || k.toLowerCase().includes("placeholder")) return null;
  if (!u.startsWith("http")) return null;
  return { url: u, key: k };
}

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Honors shared-schema mode via NEXT_PUBLIC_SUPABASE_SCHEMA.
 *
 * Returns null on failure (missing env vars, placeholder values, cookie
 * access failure, etc.) so server components never throw uncaught errors
 * during prerender — critical for building without keys configured.
 */
export function createSupabaseServerClient() {
  try {
    const config = hasUsableConfig();
    if (!config) return null;

    let cookieStore: ReturnType<typeof cookies>;
    try {
      cookieStore = cookies();
    } catch {
      return null;
    }

    return _createServerClient(config.url, config.anon, {
      db: {
        schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public",
      },
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Alias export for legacy imports expecting createServerClient.
 */
export const createServerClient = createSupabaseServerClient;

/**
 * Service-role server client. Use ONLY in trusted server contexts
 * (cron jobs, webhooks, admin routes). Never expose to the browser.
 * Returns null on failure instead of throwing.
 */
export function createSupabaseServiceRoleClient() {
  try {
    const config = hasUsableServiceConfig();
    if (!config) return null;

    return _createServerClient(config.url, config.key, {
      db: {
        schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public",
      },
      cookies: {
        get() {
          return undefined;
        },
        set() {
          /* no-op */
        },
        remove() {
          /* no-op */
        },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Safe query helper — wraps a Supabase query and returns a fallback value
 * on any failure (including missing client). Guarantees server components
 * rendering during prerender never throw.
 */
export async function safeQuery<T>(
  runner: () => Promise<{ data: T | null; error: unknown }>,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await runner();
    if (error || data == null) return fallback;
    return data;
  } catch {
    return fallback;
  }
}
