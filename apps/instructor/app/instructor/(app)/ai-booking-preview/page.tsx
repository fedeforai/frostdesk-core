'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAIBookingSuggestionContext } from '@/lib/instructorApi';
import type { AIBookingSuggestionContext } from '@/lib/instructorApi';
import { AIBookingAvailabilityPreview } from '@/components/ai-booking-preview/AIBookingAvailabilityPreview';
import { AIBookingBusySlotsPreview } from '@/components/ai-booking-preview/AIBookingBusySlotsPreview';
import { AIBookingRecentBookingsPreview } from '@/components/ai-booking-preview/AIBookingRecentBookingsPreview';

export default function AIBookingPreviewPage() {
  const [data, setData] = useState<AIBookingSuggestionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchAIBookingSuggestionContext();
      setData(result);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const raw = e?.message ?? 'Impossibile caricare il contesto';
      if (e?.status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        setData(null);
        return;
      }
      if (e?.status === 403) {
        setError(raw || 'Non autorizzato');
        setData(null);
        return;
      }
      setData(null);
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|UPSTREAM_DOWN|context|contesto|could not be loaded|non è raggiungibile|servizio sia disponibile/i.test(raw);
      setError(isConnectionError
        ? 'API unreachable. Make sure the API is running (e.g. port 3001) and try again.'
        : raw);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  if (loading && !data && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          Anteprima contesto prenotazioni
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
          Dati di contesto usati per i suggerimenti di prenotazione.
        </p>
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
              onClick={() => void loadContext()}
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
      </div>
    );
  }

  const context = data ?? {
    availability: [],
    busySlots: [],
    recentBookings: [],
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Anteprima contesto prenotazioni
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Dati di contesto usati per i suggerimenti di prenotazione (disponibilità, slot occupati, prenotazioni recenti).
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)', marginBottom: '0.75rem' }}>
          Disponibilità (contesto)
        </h2>
        <div style={{ border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
          <AIBookingAvailabilityPreview availability={context.availability} />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)', marginBottom: '0.75rem' }}>
          Slot occupati (cache calendario)
        </h2>
        <div style={{ border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
          <AIBookingBusySlotsPreview busySlots={context.busySlots} />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)', marginBottom: '0.75rem' }}>
          Prenotazioni recenti (contesto)
        </h2>
        <div style={{ border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
          <AIBookingRecentBookingsPreview recentBookings={context.recentBookings} />
        </div>
      </section>
    </div>
  );
}
