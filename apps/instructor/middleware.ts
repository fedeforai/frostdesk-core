import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_TRACE = process.env.AUTH_TRACE === '1';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', path);

  const res = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as Record<string, unknown>);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

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
      hasSession: !!session,
      sessionUserId: session?.user?.id ?? null,
    }));
  }

  // Public routes: no redirect to login
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

  if (path.startsWith('/instructor') && !isPublic && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/instructor/login';
    const fullNext = path + (req.nextUrl.search || '');
    url.searchParams.set('next', fullNext);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
