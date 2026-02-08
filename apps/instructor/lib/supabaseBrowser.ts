import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for the browser. Uses cookies so the server (middleware + Server
 * Components) can read the same session. Do not use createClient from supabase-js
 * here — that stores the session in localStorage and the server would never see it.
 */
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createBrowserClient(url, key);
}
