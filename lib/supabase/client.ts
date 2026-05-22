import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "agentdesk";

export default function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createBrowserClient(url, anonKey, {
    db: { schema: SUPABASE_SCHEMA },
  });
}
