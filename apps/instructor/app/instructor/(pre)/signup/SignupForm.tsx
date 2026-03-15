'use client';

/**
 * Instructor signup (email/password + Google OAuth).
 * Supabase Redirect URLs to add: http://localhost:3000/instructor/auth/callback,
 * http://localhost:3002/instructor/auth/callback, https://[your-instructor-domain]/instructor/auth/callback
 */

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignupForm() {
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
          ? `${window.location.origin}/instructor/auth/callback`
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

  const handleGoogleSignUp = async () => {
    if (!supabase) {
      setError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/instructor/auth/callback?next=${encodeURIComponent(after)}`
          : undefined;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError('Sign up with Google failed. Please try again.');
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.25)',
              background: '#fff',
              color: '#1f2937',
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            Already have an account?{' '}
            <Link href={`/instructor/login?next=${encodeURIComponent(after)}`} style={{ color: '#e5e7eb' }}>
              Sign in
            </Link>
          </div>

          {ok && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
              After email verification, come back and{' '}
              <Link href={`/instructor/login?next=${encodeURIComponent('/instructor/onboarding')}`} style={{ color: '#e5e7eb' }}>
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
