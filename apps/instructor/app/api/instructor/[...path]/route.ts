import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const AUTH_TRACE = process.env.AUTH_TRACE === '1';

/** Timeout for upstream fetch to avoid FUNCTION_INVOCATION_TIMEOUT (return 504 instead). */
const UPSTREAM_TIMEOUT_MS = 15_000;

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

function trace(msg: string, extra?: Record<string, unknown>) {
  if (!AUTH_TRACE) return;
  const tail = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[auth-proxy] ${msg}${tail}`);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, 'GET');
}
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, 'POST');
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, 'PATCH');
}
export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, 'PUT');
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, 'DELETE');
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  const url = new URL(request.url);

  // ── Track cookie changes so we can propagate refreshed tokens to the browser ──
  const cookieChanges: CookieToSet[] = [];

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Collect changes so we can forward them to the response.
          cookieChanges.push(...cookiesToSet);
          // Also write to the cookie store so subsequent reads see fresh values.
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set({ name, value, ...(options ?? {}) });
            } catch {
              // Swallow in read-only contexts
            }
          });
        },
      },
    }
  );

  // getSession() reads the JWT from cookies and refreshes if the access token
  // is expired.  Any refreshed tokens are captured in cookieChanges above so
  // the browser receives them in the response.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (AUTH_TRACE) {
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map((c) => c.name);
    const hasSbAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
    );
    trace('session-check', {
      method,
      path: url.pathname,
      hasSbAuthCookie,
      cookieNames,
      tokenPresent: !!token,
      hasSession: !!session,
      sessionError: sessionError?.message ?? null,
      cookieRefreshCount: cookieChanges.length,
    });
  }

  if (!token) {
    const res = NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Missing session' },
      { status: 401 }
    );
    // Propagate any cookie changes (e.g., cleared session on signOut)
    for (const c of cookieChanges) {
      res.cookies.set(c.name, c.value, c.options as Record<string, unknown>);
    }
    return res;
  }

  const { path: pathParams } = await context.params;
  const pathSegments = Array.isArray(pathParams) ? pathParams : [];
  const backendPath = `/instructor/${pathSegments.join('/')}`;
  const query = url.searchParams.toString();
  const backendUrl = `${API_BASE.replace(/\/$/, '')}${backendPath}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const ifMatch = request.headers.get('if-match');
  if (ifMatch) headers['If-Match'] = ifMatch;

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, {
      method,
      headers,
      body: body ?? undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startMs;
    const isAbort = e instanceof Error && e.name === 'AbortError';
    const baseHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || '***';
    console.log('[instructor-proxy]', { handler: 'proxy', baseHost, durationMs, aborted: isAbort });
    if (isAbort) {
      const res = NextResponse.json(
        { ok: false, error: 'UPSTREAM_TIMEOUT', code: 'GATEWAY_TIMEOUT', message: 'Upstream did not respond in time' },
        { status: 504 }
      );
      for (const c of cookieChanges) {
        res.cookies.set(c.name, c.value, c.options as Record<string, unknown>);
      }
      return res;
    }
    trace('upstream-fetch-failed', { backendUrl });
    const res = NextResponse.json(
      { ok: false, error: 'UPSTREAM_DOWN', message: 'API server unreachable at ' + API_BASE },
      { status: 502 }
    );
    for (const c of cookieChanges) {
      res.cookies.set(c.name, c.value, c.options as Record<string, unknown>);
    }
    return res;
  }

  clearTimeout(timeoutId);
  const durationMs = Date.now() - startMs;
  const baseHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || '***';
  console.log('[instructor-proxy]', { handler: 'proxy', baseHost, durationMs });

  trace('upstream-status', { status: upstream.status, upstreamStatus: upstream.status });

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  const res = NextResponse.json(payload, { status: upstream.status });

  // ── Propagate refreshed auth cookies to the browser ──────────────────────
  for (const c of cookieChanges) {
    res.cookies.set(c.name, c.value, c.options as Record<string, unknown>);
  }

  return res;
}
