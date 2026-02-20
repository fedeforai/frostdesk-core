import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron handler — runs every Monday at 06:00 UTC.
 *
 * Calls POST /admin/reports/weekly/store on the Fastify backend
 * with the x-admin-cron-secret header for authentication.
 *
 * Security:
 *   1. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` — we verify it.
 *   2. We forward our own `x-admin-cron-secret` to the backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const ADMIN_CRON_SECRET = process.env.ADMIN_REPORTS_CRON_SECRET ?? '';

export async function GET(request: NextRequest) {
  // ── Verify Vercel Cron secret ─────────────────────────────────────
  // Vercel sends Authorization: Bearer <CRON_SECRET> on cron invocations
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (CRON_SECRET && token !== CRON_SECRET) {
    console.warn('[cron/weekly-report] Rejected: invalid CRON_SECRET');
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
      { status: 401 },
    );
  }

  // ── Call Fastify backend ──────────────────────────────────────────
  if (!ADMIN_CRON_SECRET) {
    console.error('[cron/weekly-report] ADMIN_REPORTS_CRON_SECRET not set — aborting');
    return NextResponse.json(
      { ok: false, error: 'MISCONFIGURED', message: 'ADMIN_REPORTS_CRON_SECRET not set' },
      { status: 500 },
    );
  }

  const url = `${API_BASE.replace(/\/$/, '')}/admin/reports/weekly/store`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-cron-secret': ADMIN_CRON_SECRET,
      },
    });

    const body = await upstream.text();
    let payload: unknown;
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      payload = { raw: body };
    }

    if (!upstream.ok) {
      console.error(
        `[cron/weekly-report] Backend returned ${upstream.status}:`,
        payload,
      );
      return NextResponse.json(
        { ok: false, error: 'UPSTREAM_ERROR', status: upstream.status, detail: payload },
        { status: upstream.status },
      );
    }

    console.log('[cron/weekly-report] Success:', payload);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/weekly-report] Fetch failed:', message);
    return NextResponse.json(
      { ok: false, error: 'UPSTREAM_DOWN', message },
      { status: 502 },
    );
  }
}
