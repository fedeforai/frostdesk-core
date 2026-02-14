import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Supabase client for the browser. Singleton so we don't get "Multiple GoTrueClient
 * instances detected" or inconsistent session state. Uses cookies so the server
 * (middleware + Server Components) can read the same session.
 */
export function getSupabaseBrowser() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  browserClient = createBrowserClient(url, key);
  return browserClient;
}
