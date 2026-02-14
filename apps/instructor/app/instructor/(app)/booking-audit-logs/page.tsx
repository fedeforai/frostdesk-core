'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchInstructorBookingAuditLogs } from '@/lib/instructorApi';
import { BookingAuditLogsTable } from '@/components/bookings/BookingAuditLogsTable';
import type { BookingAuditLogRow } from '@/lib/instructorApi';

export default function BookingAuditLogsPage() {
  const [items, setItems] = useState<BookingAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInstructorBookingAuditLogs();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const raw = e?.message ?? 'Impossibile caricare i log di audit';
      if (e?.status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        setItems([]);
        return;
      }
      if (e?.status === 403) {
        setError(raw || 'Non autorizzato');
        setItems([]);
        return;
      }
      setItems([]);
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|audit|could not be loaded/i.test(raw);
      setError(isConnectionError
        ? 'Connessione non riuscita. Verifica che il servizio sia disponibile e riprova.'
        : raw);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading && items.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Caricamento…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Log di audit prenotazioni
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Storico delle azioni sulle prenotazioni per tracciabilità.
      </p>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          border: '1px solid rgba(248, 113, 113, 0.5)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          <span>
            {error === 'UNAUTHORIZED' ? (
              <>Sessione scaduta o non autenticato. <Link href="/instructor/login" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Accedi</Link></>
            ) : (
              error
            )}
          </span>
          {error !== 'UNAUTHORIZED' && (
            <button
              type="button"
              onClick={() => void loadLogs()}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 6,
                border: '1px solid rgba(248, 113, 113, 0.6)',
                background: 'transparent',
                color: '#fca5a5',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.8125rem',
              }}
            >
              Riprova
            </button>
          )}
        </div>
      )}

      {!error && (
        <div style={{
          border: '1px solid rgba(71, 85, 105, 0.5)',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.2)',
        }}>
          <BookingAuditLogsTable items={items} />
        </div>
      )}
    </div>
  );
}
