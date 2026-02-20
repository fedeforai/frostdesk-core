import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabaseServer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  let bearerToken: string | null = null;
  const session = await getServerSession();
  if (session?.access_token) {
    bearerToken = session.access_token;
  } else {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7).trim();
    }
  }
  if (!bearerToken) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Missing session' },
      { status: 401 }
    );
  }

  const { path: pathParams } = await context.params;
  const pathSegments = Array.isArray(pathParams)
    ? pathParams
    : typeof pathParams === 'string'
      ? (pathParams as string).split('/').filter(Boolean)
      : [];
  const backendPath = `/admin/${pathSegments.join('/')}`;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const backendUrl = `${API_BASE.replace(/\/$/, '')}${backendPath}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${bearerToken}`,
  };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, {
      method,
      headers,
      body: body ?? undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'UPSTREAM_DOWN', message: 'Cannot reach API' },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return NextResponse.json(payload, { status: upstream.status });
}
