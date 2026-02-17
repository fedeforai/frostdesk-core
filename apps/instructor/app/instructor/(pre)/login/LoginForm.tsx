'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const DEFAULT_AFTER_LOGIN = '/instructor/gate';

function getAfterLogin(sp: ReturnType<typeof useSearchParams>): string {
  const next = sp.get('next');
  if (!next) return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  if (next.startsWith('//')) return DEFAULT_AFTER_LOGIN;
  return next;
}

export default function LoginForm() {
  const router = useRouter();
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
      setError('Please enter email and password');
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

      router.replace(afterLogin);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#0b1220',
        color: '#e5e7eb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 16,
          padding: 20,
          background: 'rgba(15,23,42,0.85)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>
            FrostDesk
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Instructor login
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{
              width: '100%',
              marginTop: 6,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.25)',
              background: '#0f172a',
              color: '#e5e7eb',
              outline: 'none',
            }}
          />

          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>
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
              marginTop: 6,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.25)',
              background: '#0f172a',
              color: '#e5e7eb',
              outline: 'none',
            }}
          />

          {error && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: '#fecaca',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                padding: 10,
                borderRadius: 12,
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
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.25)',
              background: loading ? '#111827' : '#e5e7eb',
              color: loading ? '#94a3b8' : '#0b1220',
              fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            No account?{' '}
            <Link href={`/instructor/signup?next=${encodeURIComponent(afterLogin)}`} style={{ color: '#e5e7eb' }}>
              Create one
            </Link>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            After login: <span style={{ color: '#e5e7eb' }}>{afterLogin}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
