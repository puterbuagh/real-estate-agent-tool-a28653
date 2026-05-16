import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Honors the shared-schema mode by binding every query
 * to the schema named in SUPABASE_SCHEMA (falls back to "public").
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return createServerClient(url, anonKey, {
    db: {
      schema: process.env.SUPABASE_SCHEMA || "public",
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
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
}

/**
 * Service-role server client. Use ONLY in trusted server contexts
 * (cron jobs, webhooks, admin routes). Never expose to the browser.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase service env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

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
}
