'use client';

import { useState } from 'react';
import {
  getCalendarOAuthStartUrl,
  disconnectCalendar,
  syncCalendar,
  type InstructorCalendarConnection,
} from '@/lib/instructorApi';

interface CalendarConnectionPanelProps {
  connection: InstructorCalendarConnection | null;
  onConnectionChange: (connection?: InstructorCalendarConnection | null) => void;
}

export default function CalendarConnectionPanel({
  connection,
  onConnectionChange,
}: CalendarConnectionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = await getCalendarOAuthStartUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Impossibile avviare il collegamento');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Vuoi scollegare il calendario?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await disconnectCalendar();
      onConnectionChange(null);
      window.location.reload();
    } catch (err: any) {
        setError(err.message || 'Scollegamento non riuscito');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      await syncCalendar();
      // Connection remains the same after sync
      onConnectionChange();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Sincronizzazione non riuscita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Collegamento calendario
      </h2>

      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '0.375rem',
          color: 'rgba(252, 165, 165, 0.95)',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {connection ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Provider:</strong>{' '}
              <span style={{ color: 'rgba(148, 163, 184, 0.9)' }}>
                {connection.provider || 'google'}
              </span>
            </div>
            {connection.calendar_id && (
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Calendar ID:</strong>{' '}
                <span style={{ color: 'rgba(148, 163, 184, 0.9)' }}>{connection.calendar_id}</span>
              </div>
            )}
            <div>
              <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Stato:</strong>{' '}
              <span style={{ color: 'rgba(74, 222, 128, 0.95)', fontWeight: '500' }}>Connesso</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: 'rgba(165, 180, 252, 1)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.currentTarget.style.outline = '2px solid #3b82f6';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              aria-label="Aggiorna calendario"
            >
              {loading ? 'Sincronizzazione...' : 'Aggiorna'}
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'rgba(248, 113, 113, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.currentTarget.style.outline = '2px solid #ef4444';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              aria-label="Scollega calendario"
            >
              {loading ? 'Scollegamento...' : 'Scollega'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>Status:</strong>{' '}
            <span style={{ color: 'rgba(248, 113, 113, 0.95)', fontWeight: '500' }}>Non connesso</span>
          </div>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
            Collega il tuo Google Calendar per evitare sovrapposizioni con le prenotazioni. Gli slot occupati sul calendario non saranno proposti ai clienti.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: 'rgba(165, 180, 252, 1)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              outline: 'none',
            }}
            onFocus={(e) => {
              if (!loading) {
                e.currentTarget.style.outline = '2px solid #3b82f6';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            aria-label="Collega calendario"
          >
            {loading ? 'Reindirizzamento...' : 'Collega'}
          </button>
        </div>
      )}
    </div>
  );
}
