'use client';

import Link from 'next/link';
import { useState } from 'react';
import { updateInstructorBookingStatus, deleteInstructorBooking } from '@/lib/instructorApi';

export type Booking = {
  id: string;
  customer_id?: string | null;
  customer_name: string | null;
  customer_display_name?: string | null;
  customer_phone?: string | null;
  start_time: string;
  end_time: string;
  status: string;
};

/** Prefer join-sourced customer info, fallback to legacy customer_name. */
function bookingCustomerLabel(b: Booking): string {
  const name = b.customer_display_name?.trim();
  if (name) return name;
  const phone = b.customer_phone?.trim();
  if (phone) return phone.length <= 6 ? `•••${phone.slice(-4)}` : `${phone.slice(0, 4)}•••${phone.slice(-4)}`;
  return b.customer_name?.trim() ?? '—';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

const STATUS_OPTIONS = ['draft', 'pending', 'confirmed', 'modified', 'cancelled', 'declined'] as const;

export function BookingsTable({
  items,
  onUpdated,
}: {
  items: Booking[];
  onUpdated?: () => void;
}) {
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(id: string, newStatus: string) {
    setError(null);
    setChangingId(id);
    try {
      await updateInstructorBookingStatus(id, newStatus);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Cancel this booking? (It will be marked as cancelled.)')) return;
    setError(null);
    setChangingId(id);
    try {
      await deleteInstructorBooking(id);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setChangingId(null);
    }
  }

  const border = '1px solid rgba(148, 163, 184, 0.25)';
  const thStyle = { padding: '0.5rem 0.75rem', borderBottom: '2px solid rgba(148, 163, 184, 0.3)', color: 'rgba(226, 232, 240, 0.95)', textAlign: 'left' as const };
  const tdStyle = { padding: '0.5rem 0.75rem', borderBottom: border, color: 'rgba(226, 232, 240, 0.92)' };

  return (
    <div style={{ border, borderRadius: 10, overflow: 'hidden', background: 'rgba(30, 41, 59, 0.4)' }}>
      {error && (
        <p style={{ marginBottom: '0.75rem', color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Cliente</th>
            <th style={thStyle}>Inizio</th>
            <th style={thStyle}>Fine</th>
            <th style={thStyle}>Stato</th>
            <th style={{ ...thStyle, width: '1%' }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr
              key={b.id}
              style={{
                borderBottom: border,
                ...(b.status === 'confirmed' ? { backgroundColor: 'rgba(34, 197, 94, 0.12)' } : {}),
                ...(b.status === 'cancelled' || b.status === 'declined' ? { opacity: 0.7 } : {}),
              }}
            >
              <td
                style={{
                  ...tdStyle,
                  ...(b.status === 'confirmed' ? { borderLeft: '3px solid rgba(34, 197, 94, 0.7)', paddingLeft: '0.5rem' } : {}),
                }}
              >
                {bookingCustomerLabel(b)}
              </td>
              <td style={tdStyle}>{formatDateTime(b.start_time)}</td>
              <td style={tdStyle}>{formatDateTime(b.end_time)}</td>
              <td style={tdStyle}>
                <select
                  value={b.status}
                  onChange={(e) => handleStatusChange(b.id, e.target.value)}
                  disabled={changingId !== null}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'rgba(226, 232, 240, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: 6,
                    ...(b.status === 'confirmed' ? { color: '#86efac', fontWeight: 500 } : {}),
                  }}
                  aria-label="Cambia stato"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <Link
                  href={`/instructor/bookings/${b.id}`}
                  style={{ marginRight: '0.5rem', fontSize: '0.875rem', color: '#7dd3fc' }}
                  aria-label="Visualizza o modifica"
                >
                  Modifica
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  disabled={changingId !== null}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                    background: 'transparent',
                    border: '1px solid rgba(248, 113, 113, 0.5)',
                    borderRadius: 6,
                    cursor: changingId !== null ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Elimina prenotazione"
                >
                  {changingId === b.id ? '…' : 'Elimina'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
