import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabaseServer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const AUTH_TRACE = process.env.AUTH_TRACE === '1';

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

  const authHeader = request.headers.get('authorization');
  const hasAuthHeader = !!(authHeader && authHeader.startsWith('Bearer '));
  const allCookies = request.cookies.getAll();
  const hasSbAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  );

  const session = await getServerSession();
  const token = session?.access_token;

  if (AUTH_TRACE) {
    trace('session-check', {
      method,
      path: url.pathname,
      hasAuthHeader,
      hasSbAuthCookie,
      cookieNames: allCookies.map((c) => c.name),
      tokenPresent: !!token,
      hasSession: !!session,
    });
  }

  if (!session?.access_token) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Missing session' },
      { status: 401 }
    );
  }

  const { path: pathParams } = await context.params;
  const pathSegments = Array.isArray(pathParams) ? pathParams : [];
  const backendPath = `/instructor/${pathSegments.join('/')}`;
  const query = url.searchParams.toString();
  const backendUrl = `${API_BASE.replace(/\/$/, '')}${backendPath}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.access_token}`,
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

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, {
      method,
      headers,
      body: body ?? undefined,
    });
  } catch (e) {
    trace('upstream-fetch-failed', { backendUrl });
    return NextResponse.json(
      { ok: false, error: 'UPSTREAM_DOWN' },
      { status: 502 }
    );
  }

  trace('upstream-status', { status: upstream.status, upstreamStatus: upstream.status });

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return NextResponse.json(payload, { status: upstream.status });
}
