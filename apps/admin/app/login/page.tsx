'use client';

import { useMemo, useState } from 'react';
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

export default function AdminLoginPage() {
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

      // Redirect a tutta pagina così i cookie di sessione sono inviati alla richiesta successiva
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
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Admin login
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Usa un utente presente in <code style={{ background: '#f3f4f6', padding: '0 4px' }}>admin_users</code> (stesso Supabase dell’instructor).
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 4 }}>
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
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 4 }}>
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
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
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
              border: '1px solid #d1d5db',
              background: loading ? '#f3f4f6' : '#111827',
              color: loading ? '#9ca3af' : '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
            Dopo l’accesso: <Link href={afterLogin} style={{ color: '#2563eb' }}>{afterLogin}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
