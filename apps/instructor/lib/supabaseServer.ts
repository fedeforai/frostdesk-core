import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components / Route Handlers.
 * Reads session from request cookies so getSession() returns the logged-in user.
 */
export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
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
