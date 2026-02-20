import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const GATE_PATH = '/instructor/gate';

/**
 * Handles the redirect from Supabase after email confirmation (or magic link).
 * Exchanges the `code` query param for a session and sets cookies, then redirects to the gate.
 * If no code is present, redirects to gate anyway (e.g. user re-visiting the link).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? GATE_PATH;
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : GATE_PATH;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        const value = cookieStore.get(name)?.value;
        if (value && typeof value === 'string' && value.startsWith('base64-')) {
          try {
            return Buffer.from(value.slice(7), 'base64').toString('utf8');
          } catch {
            return value;
          }
        }
        return value;
      },
      set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; httpOnly?: boolean }) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: { path?: string }) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Log but still redirect so user can try logging in manually
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
