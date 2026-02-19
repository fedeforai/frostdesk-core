import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_TRACE = process.env.AUTH_TRACE === '1';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', path);

  // ── Supabase client with proper cookie refresh handling ──────────────────
  // `let` so setAll can recreate the response when tokens are refreshed.
  let res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // 1. Write to request so subsequent cookie reads see fresh tokens
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          // 2. Recreate the "next" response with updated request headers
          res = NextResponse.next({ request: { headers: requestHeaders } });
          // 3. Write to response so the browser receives fresh tokens
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as Record<string, unknown>);
          });
        },
      },
    }
  );

  // ── Auth check — getUser() validates server-side & handles refresh ───────
  // Previously used getSession() which reads the JWT locally and can return
  // null when the access token expires, causing spurious login redirects.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (AUTH_TRACE) {
    const allCookies = req.cookies.getAll();
    const cookieNames = allCookies.map((c) => c.name);
    const hasSbAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
    );
    console.log('[auth-middleware]', JSON.stringify({
      path,
      cookieNames,
      hasSbAuthCookie,
      hasUser: !!user,
      userId: user?.id ?? null,
    }));
  }

  // ── Public routes: no redirect to login ──────────────────────────────────
  const isPublic =
    path === '/instructor/login' ||
    path === '/instructor/signup' ||
    path === '/login' ||
    path === '/signup' ||
    path.startsWith('/instructor/auth/callback') ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path === '/favicon.ico';

  if (path.startsWith('/instructor') && !isPublic && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/instructor/login';
    const fullNext = path + (req.nextUrl.search || '');
    url.searchParams.set('next', fullNext);
    const redirectRes = NextResponse.redirect(url);
    // Preserve any refreshed auth cookies on the redirect response
    res.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value);
    });
    return redirectRes;
  }

  return res;
}

export const config = {
  // Exclude /api so API routes run without middleware (avoid 404 when middleware throws e.g. missing env on Vercel)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
