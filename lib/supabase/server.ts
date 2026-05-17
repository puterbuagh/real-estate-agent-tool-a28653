import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Honors the shared-schema mode by binding every query
 * to the schema named in SUPABASE_SCHEMA (falls back to "public").
 *
 * Returns null on failure (missing env vars, cookie access failure, etc.)
 * so that server components never throw uncaught errors during prerender.
 */
export function createSupabaseServerClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) return null;

    let cookieStore: ReturnType<typeof cookies>;
    try {
      cookieStore = cookies();
    } catch {
      return null;
    }

    return createServerClient(url, anonKey, {
      db: {
        schema: process.env.SUPABASE_SCHEMA || "public",
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
 * Service-role server client. Use ONLY in trusted server contexts
 * (cron jobs, webhooks, admin routes). Never expose to the browser.
 *
 * Returns null on failure instead of throwing.
 */
export function createSupabaseServiceRoleClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) return null;

    return createServerClient(url, serviceKey, {
      db: {
        schema: process.env.SUPABASE_SCHEMA || "public",
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
 * on any failure (including missing client). Use this to guarantee that
 * server components rendering during prerender never throw.
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
