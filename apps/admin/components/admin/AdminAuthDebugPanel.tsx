'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { setAdminToken, clearAdminToken } from '@/components/shared/useAdminCheck';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Decode JWT payload without verification (display only). */
function decodeJwtPayload(token: string): { sub?: string; email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as { sub?: string; email?: string };
    return { sub: payload.sub, email: payload.email };
  } catch {
    return {};
  }
}

/**
 * Dev-only panel: API base URL, JWT sub/email (client-side decode), GET /admin/check result.
 * Renders only when NODE_ENV !== 'production'.
 */
export default function AdminAuthDebugPanel() {
  const [mounted, setMounted] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<number | null>(null);
  const [checkBody, setCheckBody] = useState<Record<string, unknown> | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [pasteToken, setPasteToken] = useState('');
  const [tokenSuffix, setTokenSuffix] = useState<string | null>(null);
  const checkUrl = `${API_BASE_URL.replace(/\/$/, '')}/admin/check`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || process.env.NODE_ENV === 'production') return;

    let cancelled = false;

    (async () => {
      let token: string | null = null;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) token = session.access_token;
      }
      if (!token && typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('fd_admin_token');
        if (token) token = token.trim();
      }
      if (cancelled) return;
      if (!token) {
        setCheckError('No session. Paste token below and click "Set token".');
        setSub(null);
        setEmail(null);
        setTokenSuffix(null);
        setCheckStatus(null);
        setCheckBody(null);
        return;
      }
      const { sub: s, email: e } = decodeJwtPayload(token);
      setSub(s ?? null);
      setEmail(e ?? null);
      setTokenSuffix(token.length >= 8 ? token.slice(-8) : null);
      setCheckError(null);

      try {
        const res = await fetch(checkUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setCheckStatus(res.status);
        const body = await res.json().catch(() => ({}));
        setCheckBody(body);
        setCheckError(null);
      } catch (err) {
        if (cancelled) return;
        setCheckStatus(null);
        setCheckBody(null);
        setCheckError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, checkUrl]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #fcd34d',
        borderRadius: '0.5rem',
        backgroundColor: '#fffbeb',
        fontSize: '0.8125rem',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontWeight: 600 }}>
        [DEV] Admin auth debug
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#78350f' }}>
        <div><strong>API base URL:</strong> {API_BASE_URL}</div>
        <div><strong>Request:</strong> GET {checkUrl}</div>
        <div><strong>Token sub:</strong> {sub ?? '—'}</div>
        <div><strong>Token email:</strong> {email ?? '—'}</div>
        <div><strong>Token suffix:</strong> {tokenSuffix != null ? `…${tokenSuffix}` : '—'}</div>
        <div><strong>GET /admin/check:</strong> {checkError ? `Error: ${checkError}` : checkStatus != null ? `HTTP ${checkStatus} ${checkBody?.ok ? 'ok: true' : ''} ${checkBody?.isAdmin !== undefined ? `isAdmin: ${String(checkBody.isAdmin)}` : ''}` : '…'}</div>
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="password"
            placeholder="Paste JWT token (e.g. from: node scripts/supa_login.mjs)"
            value={pasteToken}
            onChange={(e) => setPasteToken(e.target.value)}
            style={{ flex: '1', minWidth: '200px', padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
            aria-label="Admin token"
          />
          <button
            type="button"
            onClick={() => {
              const t = pasteToken.trim();
              if (t) {
                setAdminToken(t);
                window.location.reload();
              }
            }}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer' }}
          >
            Set token
          </button>
          <button
            type="button"
            onClick={() => {
              clearAdminToken();
              window.location.reload();
            }}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer' }}
          >
            Clear token
          </button>
        </div>
      </div>
    </div>
  );
}
