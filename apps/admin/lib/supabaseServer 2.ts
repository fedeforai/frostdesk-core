import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components / Route Handlers.
 * Reads session from request cookies.
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
            // leave unchanged
          }
        }
        return value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignored in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ignored
        }
      },
    },
  });
}

export type AuthSession = { user: { id?: string; email?: string | null }; access_token?: string } | null;

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
