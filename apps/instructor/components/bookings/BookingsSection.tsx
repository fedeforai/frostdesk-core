'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchInstructorBookings } from '@/lib/instructorApi';
import { BookingsTable, type Booking } from './BookingsTable';

export function BookingsSection() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetchInstructorBookings();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Couldn\'t load bookings';
      const msg =
        /UNAUTHORIZED|No session/i.test(raw)
          ? 'UNAUTHORIZED'
          : /FAILED_TO_LOAD_BOOKINGS|NOT_FOUND|ONBOARDING/i.test(raw)
            ? 'Impossibile caricare le prenotazioni. Verifica che l\'API sia avviata e riprova.'
            : raw;
      setLoadError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError === 'UNAUTHORIZED') {
    return (
      <div style={styles.wrap}>
        <p style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>
          Sessione scaduta o non autenticato.{' '}
          <Link href="/instructor/login" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
            Accedi
          </Link>
        </p>
      </div>
    );
  }

  /* Error state: show only error + Retry, no empty state */
  if (loadError && loadError !== 'UNAUTHORIZED') {
    return (
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
            Nuova prenotazione
          </Link>
        </div>
        <div style={styles.errorBanner}>
          {loadError}
          {' '}
          <button type="button" onClick={load} style={styles.retryBtn}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  /* Loading: show only loading */
  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
            Nuova prenotazione
          </Link>
        </div>
        <p style={styles.muted}>Caricamento prenotazioni…</p>
      </div>
    );
  }

  /* Success: empty or table */
  return (
    <div style={styles.wrap}>
      <div style={styles.topBar}>
        <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
          Nuova prenotazione
        </Link>
      </div>
      {items.length === 0 ? (
        <p style={styles.muted}>Nessuna prenotazione.</p>
      ) : (
        <BookingsTable items={items} onUpdated={load} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  topBar: {
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  btnPrimary: {
    padding: '0.5rem 0.75rem',
    background: '#0f172a',
    color: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: '1px solid rgba(148, 163, 184, 0.3)',
  },
  muted: {
    color: 'rgba(148, 163, 184, 0.92)',
    fontSize: '0.875rem',
  },
  errorBanner: {
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(185, 28, 28, 0.2)',
    border: '1px solid rgba(248, 113, 113, 0.5)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: '0.875rem',
  },
  retryBtn: {
    marginLeft: '0.5rem',
    padding: '0.35rem 0.75rem',
    background: 'transparent',
    border: '1px solid rgba(248, 113, 113, 0.6)',
    borderRadius: 6,
    color: '#fca5a5',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
};
