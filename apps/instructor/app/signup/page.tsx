'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const DEFAULT_AFTER = '/instructor/dashboard';

function getNextPath(sp: ReturnType<typeof useSearchParams>) {
  const next = sp.get('next');
  if (!next) return DEFAULT_AFTER;
  if (!next.startsWith('/')) return DEFAULT_AFTER;
  if (next.startsWith('//')) return DEFAULT_AFTER;
  return next;
}

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const after = useMemo(() => getNextPath(sp), [sp]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!supabase) {
      setError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined;
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }

      const needsEmailConfirm = !data.session;
      if (needsEmailConfirm) {
        setOk('Confirmation email sent. Please verify your email, then sign in.');
        return;
      }

      router.replace(after);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
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
        padding: 24,
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
            Create instructor account
          </div>
        </div>

        <form onSubmit={onSubmit}>
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
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

          {ok && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: '#bbf7d0',
                background: 'rgba(34,197,94,0.10)',
                border: '1px solid rgba(34,197,94,0.20)',
                padding: 10,
                borderRadius: 12,
              }}
            >
              {ok}
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
            {loading ? 'Creating…' : 'Create account'}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(after)}`} style={{ color: '#e5e7eb' }}>
              Sign in
            </Link>
          </div>

          {ok && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
              After email verification, come back and{' '}
              <Link href={`/login?next=${encodeURIComponent('/instructor/onboarding')}`} style={{ color: '#e5e7eb' }}>
                sign in
              </Link>
              .
            </div>
          )}

          {!ok && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
              After signup: <span style={{ color: '#e5e7eb' }}>{after}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
