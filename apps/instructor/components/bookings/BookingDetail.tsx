'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateInstructorBooking, cancelInstructorBooking } from '@/lib/instructorApi';

type BookingDetailProps = {
  booking: {
    id: string;
    customer_name: string | null;
    customer_display_name?: string | null;
    customer_phone?: string | null;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    service_id?: string | null;
    meeting_point_id?: string | null;
  };
  onSaved?: () => void;
};

/** Prefer join-sourced customer info, fallback to legacy customer_name. */
function bookingCustomerLabel(booking: BookingDetailProps['booking']): string {
  const name = booking.customer_display_name?.trim();
  if (name) return name;
  const phone = booking.customer_phone?.trim();
  if (phone) return phone.length <= 6 ? `•••${phone.slice(-4)}` : `${phone.slice(0, 4)}•••${phone.slice(-4)}`;
  return booking.customer_name?.trim() ?? '—';
}

const CANCELLABLE_STATUSES = ['confirmed', 'modified'];

export function BookingDetail({ booking, onSaved }: BookingDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(booking.start_time?.slice(0, 16) ?? '');
  const [endTime, setEndTime] = useState(booking.end_time?.slice(0, 16) ?? '');
  const [notes, setNotes] = useState(booking.notes ?? '');
  const isCancelled = booking.status === 'cancelled';
  const canCancelBooking = CANCELLABLE_STATUSES.includes(booking.status);

  const initialStart = booking.start_time?.slice(0, 16) ?? '';
  const initialEnd = booking.end_time?.slice(0, 16) ?? '';
  const initialNotes = (booking.notes ?? '').trim();
  const isDirty =
    startTime !== initialStart || endTime !== initialEnd || notes.trim() !== initialNotes;

  useEffect(() => {
    setStartTime(booking.start_time?.slice(0, 16) ?? '');
    setEndTime(booking.end_time?.slice(0, 16) ?? '');
    setNotes(booking.notes ?? '');
  }, [booking.id, booking.start_time, booking.end_time, booking.notes]);

  async function handleSave() {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      await updateInstructorBooking(booking.id, {
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        notes: notes.trim() || null,
      });
      setEditing(false);
      setSuccessMessage('Saved.');
      router.refresh();
      onSaved?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscardEdit() {
    setStartTime(booking.start_time?.slice(0, 16) ?? '');
    setEndTime(booking.end_time?.slice(0, 16) ?? '');
    setNotes(booking.notes ?? '');
    setError(null);
    setSuccessMessage(null);
    setEditing(false);
  }

  async function handleCancelBooking() {
    if (
      !confirm(
        'This will permanently cancel the booking. This action is irreversible and cannot be undone. Continue?'
      )
    )
      return;
    setError(null);
    setSuccessMessage(null);
    setCancelling(true);
    try {
      await cancelInstructorBooking(booking.id);
      setSuccessMessage('Cancelled.');
      router.refresh();
      onSaved?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section>
      <h2>Booking details</h2>
      {successMessage && (
        <p style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: '#d1fae5', color: '#065f46', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
          {successMessage}
        </p>
      )}
      {error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}

      {editing ? (
        <div style={{ maxWidth: '28rem' }}>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <strong>Customer:</strong> {bookingCustomerLabel(booking)} (read-only)
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Start</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>End</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          {isDirty && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Unsaved changes</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                padding: '0.5rem 0.75rem',
                background: isDirty && !saving ? '#111827' : '#9ca3af',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: saving || !isDirty ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {saving ? 'Saving…' : (booking.status === 'confirmed' || booking.status === 'modified' ? 'Save changes' : 'Save')}
            </button>
            <button
              type="button"
              onClick={handleDiscardEdit}
              disabled={saving}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <>
          <p><strong>Customer:</strong> {bookingCustomerLabel(booking)}</p>
          <p><strong>Start:</strong> {booking.start_time}</p>
          <p><strong>End:</strong> {booking.end_time}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                ...(isCancelled
                  ? { background: '#fef2f2', color: '#991b1b' }
                  : booking.status === 'modified'
                    ? { background: '#eff6ff', color: '#1d4ed8' }
                    : { background: '#f3f4f6', color: '#374151' }),
              }}
            >
              {booking.status}
            </span>
          </p>
          <p><strong>Notes:</strong> {booking.notes ?? '—'}</p>
          {!isCancelled && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                marginTop: '0.5rem',
                marginRight: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Edit
            </button>
          )}
          {canCancelBooking && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => void handleCancelBooking()}
                disabled={cancelling}
                title="Permanently cancel this booking"
                aria-label="Cancel booking — permanent and irreversible"
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#b91c1c',
                  color: '#fff',
                  border: '2px solid #991b1b',
                  borderRadius: '0.375rem',
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {cancelling ? 'Cancelling…' : '⚠ Cancel booking (irreversible)'}
              </button>
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: '1rem' }}>
        <Link href="/instructor/bookings" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.875rem' }}>
          ← Back to Bookings
        </Link>
      </p>
    </section>
  );
}
