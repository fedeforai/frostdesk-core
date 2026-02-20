import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabaseServer';
import LogoutButton from '@/components/shared/LogoutButton';

/**
 * Debug page: shows API URL used and raw ensure-profile response.
 * Use only to verify NEXT_PUBLIC_API_URL and API reachability. Remove or restrict in production.
 */
export default async function GateDebugPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate-debug');
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
  const requestUrl = `${apiBase}/instructor/ensure-profile`;

  let status: number | null = null;
  let statusText = '';
  let bodyText = '';
  let fetchError: string | null = null;

  try {
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: '{}',
    });
    status = res.status;
    statusText = res.statusText;
    bodyText = await res.text();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'rgba(226,232,240,0.95)' }}>
        Gate debug (ensure-profile)
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Solo per verificare URL API e risposta. Non usare in produzione.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>API URL usata</h2>
        <pre style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.6)', borderRadius: '0.375rem', fontSize: '0.8125rem', overflow: 'auto', color: '#e2e8f0' }}>
          {apiBase || '(vuoto — verrà usato localhost:3001)'}
        </pre>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>Request URL</h2>
        <pre style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.6)', borderRadius: '0.375rem', fontSize: '0.8125rem', overflow: 'auto', color: '#e2e8f0' }}>
          {requestUrl}
        </pre>
      </section>

      {fetchError ? (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f87171', marginBottom: '0.5rem' }}>Errore fetch</h2>
          <pre style={{ padding: '0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.375rem', fontSize: '0.8125rem', overflow: 'auto', color: '#fca5a5' }}>
            {fetchError}
          </pre>
        </section>
      ) : (
        <>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>Response status</h2>
            <pre style={{ padding: '0.75rem', background: status && status < 400 ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${status && status < 400 ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: '0.375rem', fontSize: '0.8125rem', color: status && status < 400 ? '#86efac' : '#fca5a5' }}>
              {status} {statusText}
            </pre>
          </section>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>Response body (ensure-profile)</h2>
            <pre style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.6)', borderRadius: '0.375rem', fontSize: '0.8125rem', overflow: 'auto', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {bodyText || '(vuoto)'}
            </pre>
          </section>
        </>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <Link
          href="/instructor/gate"
          style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
        >
          Vai alla gate
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
