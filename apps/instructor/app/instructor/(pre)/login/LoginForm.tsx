'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const DEFAULT_AFTER_LOGIN = '/instructor/gate';

type Locale = 'en' | 'it';

const COPY = {
  en: {
    title: 'FrostDesk',
    subtitle: 'Instructor login',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    createOne: 'Create one',
    orContinueWith: 'or continue with',
    googleSignIn: 'Continue with Google',
    invalidCredentials: 'Invalid credentials',
    enterEmailPassword: 'Please enter email and password',
    configError: 'Configuration error. Please try again later.',
  },
  it: {
    title: 'FrostDesk',
    subtitle: 'Accesso istruttore',
    email: 'Email',
    emailPlaceholder: 'tu@esempio.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Accedi',
    signingIn: 'Accesso in corso...',
    noAccount: 'Non hai un account?',
    createOne: 'Creane uno',
    orContinueWith: 'oppure continua con',
    googleSignIn: 'Continua con Google',
    invalidCredentials: 'Credenziali non valide',
    enterEmailPassword: 'Inserisci email e password',
    configError: 'Errore di configurazione. Riprova più tardi.',
  },
} as const;

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

  const [locale, setLocale] = useState<Locale>('en');
  const t = COPY[locale];

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
      setError(t.configError);
      return;
    }
    if (!email.trim() || !password) {
      setError(t.enterEmailPassword);
      return;
    }

    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(t.invalidCredentials);
        return;
      }

      if (typeof window !== 'undefined') {
        window.location.replace(afterLogin);
        return;
      }
      router.replace(afterLogin);
      router.refresh();
    } catch {
      setError(t.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError(t.configError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${afterLogin}`,
        },
      });
      if (error) setError(t.invalidCredentials);
    } catch {
      setError(t.invalidCredentials);
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
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={() => setLocale(locale === 'en' ? 'it' : 'en')}
        aria-label={locale === 'en' ? 'Switch to Italian' : 'Switch to English'}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(15,23,42,0.85)',
          color: '#e5e7eb',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {locale === 'en' ? '🇮🇹 IT' : '🇬🇧 EN'}
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: 400,
          border: '1px solid rgba(148,163,184,0.2)',
          borderRadius: 16,
          padding: 32,
          background: 'rgba(15,23,42,0.9)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            {t.title}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>
            {t.subtitle}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
            {t.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.2)',
              background: '#0f172a',
              color: '#e5e7eb',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(148,163,184,0.2)')}
          />

          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
            {t.password}
          </label>
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder={t.passwordPlaceholder}
            autoComplete="current-password"
            style={{
              width: '100%',
              marginBottom: 20,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.2)',
              background: '#0f172a',
              color: '#e5e7eb',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(148,163,184,0.2)')}
          />

          {error && (
            <div
              style={{
                marginBottom: 16,
                fontSize: 13,
                color: '#fecaca',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                padding: '10px 14px',
                borderRadius: 10,
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
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              background: loading ? '#374151' : '#6366f1',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>{t.orContinueWith}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.2)',
            background: '#fff',
            color: '#1f2937',
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.15s',
          }}
        >
          <GoogleIcon />
          {t.googleSignIn}
        </button>

        <div style={{ marginTop: 20, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
          {t.noAccount}{' '}
          <Link
            href={`/instructor/signup?next=${encodeURIComponent(afterLogin)}`}
            style={{ color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}
          >
            {t.createOne}
          </Link>
        </div>
      </div>
    </div>
  );
}
