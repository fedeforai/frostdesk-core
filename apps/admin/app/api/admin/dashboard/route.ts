import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabaseServer';

function getApiBaseUrl(): string {
  const v =
    process.env.FROSTDESK_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!v) {
    throw new Error('Missing FROSTDESK_API_BASE_URL or NEXT_PUBLIC_API_URL');
  }
  return v.replace(/\/+$/, '');
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.access_token) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Missing session' },
      { status: 401 }
    );
  }

  const base = getApiBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${base}/admin/dashboard`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Upstream timeout'
        : err instanceof Error
          ? err.message
          : 'Proxy error';

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
