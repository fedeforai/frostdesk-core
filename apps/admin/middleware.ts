import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * In production, /admin/dev-tools returns 404.
 * On /admin and /api/admin: refresh Supabase session cookies so the proxy and getServerSession see the session.
 */
const DEV_ONLY_PATHS = ['/admin/dev-tools'];

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (process.env.NODE_ENV === 'production' && DEV_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return new NextResponse(null, { status: 404 });
  }

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as Record<string, unknown>);
          });
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {
    // Non bloccare la richiesta se il refresh sessione fallisce
  }
  return res;
}

export const config = {
  // Exclude /api/admin so API routes run without middleware (avoid 404 when middleware throws e.g. missing env on Vercel)
  matcher: ['/admin/:path*'],
};
