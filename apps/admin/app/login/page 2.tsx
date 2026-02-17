'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const DEFAULT_AFTER_LOGIN = '/admin/dashboard';

function getAfterLogin(sp: ReturnType<typeof useSearchParams>): string {
  const next = sp.get('next');
  if (!next) return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  if (next.startsWith('//')) return DEFAULT_AFTER_LOGIN;
  return next;
}

function AdminLoginForm() {
  const sp = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const afterLogin = useMemo(() => getAfterLogin(sp), [sp]);

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    if (!email.trim() || !password) {
      setError('Inserisci email e password');
      return;
    }

    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      window.location.href = afterLogin;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso fallito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0b1220',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)' }}>
            Admin login
          </div>
          <div style={{ fontSize: 12, color: 'rgba(148, 163, 184, 0.9)', marginTop: 4 }}>
            Usa un utente presente in <code style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0 4px', borderRadius: 4 }}>admin_users</code> (stesso Supabase dell&apos;instructor).
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(148, 163, 184, 0.9)', marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
            style={{
              width: '100%',
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'rgba(226, 232, 240, 0.95)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: 12, color: 'rgba(148, 163, 184, 0.9)', marginBottom: 4 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{
              width: '100%',
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'rgba(226, 232, 240, 0.95)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: '#fca5a5',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: 10,
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: loading ? 'rgba(255, 255, 255, 0.06)' : '#3b82f6',
              color: loading ? 'rgba(148, 163, 184, 0.6)' : '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Accesso in corso\u2026' : 'Accedi'}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(148, 163, 184, 0.9)' }}>
            Dopo l&apos;accesso: <Link href={afterLogin} style={{ color: '#3b82f6' }}>{afterLogin}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220', color: 'rgba(226, 232, 240, 0.9)' }}>Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
