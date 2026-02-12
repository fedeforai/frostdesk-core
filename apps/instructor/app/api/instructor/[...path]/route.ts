import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabaseServer';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof process.env.NEXT_PUBLIC_API_BASE_URL === 'string' ? process.env.NEXT_PUBLIC_API_BASE_URL : null) ||
  'http://localhost:3001';

/**
 * Same-origin proxy: reads Supabase session (cookies) on the server and forwards
 * the request to the Fastify API with Authorization Bearer token.
 * Browser never calls Fastify directly.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, 'POST');
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, 'PATCH');
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, 'DELETE');
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  const session = await getServerSession();

  if (process.env.NODE_ENV !== 'production' && session?.access_token) {
    const t = session.access_token;
    const dotCount = (t.match(/\./g) ?? []).length;
    console.log('[PROXY] token length:', t.length, 'dot count:', dotCount);
  }

  if (!session?.access_token) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const { path } = await context.params;
  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];
  const backendPath = `/instructor/${pathSegments.join('/')}`;
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const backendUrl = `${API_BASE.replace(/\/$/, '')}${backendPath}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  const res = await fetch(backendUrl, {
    method,
    headers,
    body: body ?? undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return NextResponse.json(data, { status: res.status });
}
