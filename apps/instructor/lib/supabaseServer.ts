import { createServerClient, createClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components / Route Handlers.
 * Reads session from request cookies so getSession() returns the logged-in user.
 * Uses anon key — all requests are subject to RLS.
 */
export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        let value = cookieStore.get(name)?.value;
        if (value && typeof value === 'string' && value.startsWith('base64-')) {
          try {
            value = Buffer.from(value.slice(7), 'base64').toString('utf8');
          } catch {
            // leave unchanged on decode error
          }
        }
        return value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignored in Server Components (read-only)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ignored in Server Components
        }
      },
    },
  });
}

/**
 * Server-only Supabase client with service role key.
 * Bypasses RLS — use only for trusted server-side ops (e.g. creating instructor_profiles row on first login).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export async function getSupabaseServerAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Session type returned by Supabase Auth getSession(). */
type AuthSession = { user: { id?: string; email?: string | null }; access_token?: string } | null;

/**
 * Get session from Supabase, or null if not authenticated or token invalid.
 * On "Refresh Token Not Found" (stale/invalid cookie), signs out to clear cookies
 * so the next request does not keep failing. Swallows auth errors so they don't log.
 */
export async function getServerSession(): Promise<AuthSession> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const result = await supabase.auth.getSession().catch((err: unknown) => {
    const code = (err as { code?: string })?.code;
    const isAuthErr = (err as { __isAuthError?: boolean })?.__isAuthError;
    if (code === 'refresh_token_not_found' || isAuthErr) {
      void supabase.auth.signOut().catch(() => {});
      return { data: { session: null } };
    }
    throw err;
  });
  return result?.data?.session ?? null;
}
