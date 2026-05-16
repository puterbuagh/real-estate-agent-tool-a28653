import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const schema =
    process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";

  return createBrowserClient(url, anonKey, {
    db: { schema },
  });
}

export default createClient;
