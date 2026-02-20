import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPSTREAM_HEALTH_TIMEOUT_MS = 8_000;

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_HEALTH_TIMEOUT_MS);
    const res = await fetch(`${base.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) as Record<string, unknown> : {};
    } catch {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const isTimeout =
      e instanceof Error && (e.name === 'AbortError' || e.message?.includes('abort'));
    return NextResponse.json(
      { ok: false, error: isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_DOWN' },
      { status: 502 }
    );
  }
}
