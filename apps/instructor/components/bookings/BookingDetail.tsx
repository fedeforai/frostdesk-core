'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateInstructorBooking, cancelInstructorBooking } from '@/lib/instructorApi';

type BookingDetailProps = {
  booking: {
    id: string;
    conversation_id?: string | null;
    customer_name: string | null;
    customer_display_name?: string | null;
    customer_phone?: string | null;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    service_id?: string | null;
    meeting_point_id?: string | null;
    duration_minutes?: number | null;
    party_size?: number | null;
    skill_level?: string | null;
    amount_cents?: number | null;
    currency?: string | null;
  };
  onSaved?: () => void;
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  marginBottom: '1.25rem',
};
const labelStyle: React.CSSProperties = { fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' };
const valueStyle: React.CSSProperties = { fontSize: '0.9375rem', color: 'rgba(226, 232, 240, 0.95)', fontWeight: 500 };
const rowStyle: React.CSSProperties = { marginBottom: '1rem' };

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}
function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return formatDateTime(start) || formatDateTime(end) || '—';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', hour12: false })} – ${e.toLocaleTimeString('en-GB', { timeStyle: 'short', hour12: false })}`;
}

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
      if ((e as any)?.code === 'BILLING_BLOCKED') {
        setError('Subscription required. Contact support to activate billing.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to save');
      }
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
      if ((e as any)?.code === 'BILLING_BLOCKED') {
        setError('Subscription required. Contact support to activate billing.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to cancel booking');
      }
    } finally {
      setCancelling(false);
    }
  }

  const hasConversation = Boolean(booking.conversation_id?.trim());

  return (
    <section>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Booking details
      </h2>

      {successMessage && (
        <p style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgba(74, 222, 128, 0.95)', borderRadius: 8, fontSize: '0.875rem' }}>
          {successMessage}
        </p>
      )}
      {error && <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}

      <div style={cardStyle}>
        <div style={{ ...rowStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={labelStyle}>Booking ID</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#7dd3fc', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem 0.5rem', borderRadius: 6 }}>
                {booking.id}
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(booking.id).catch(() => {}); }}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  color: 'rgba(148, 163, 184, 0.95)',
                  cursor: 'pointer',
                }}
                aria-label="Copy booking ID"
              >
                Copy
              </button>
            </div>
          </div>
          {hasConversation && (
            <Link
              href={`/instructor/inbox/${booking.conversation_id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Open conversation
            </Link>
          )}
        </div>

        {editing ? (
          <div style={{ maxWidth: '28rem', marginTop: '1rem' }}>
            <div style={rowStyle}>
              <div style={labelStyle}>Customer</div>
              <div style={valueStyle}>{bookingCustomerLabel(booking)} (read-only)</div>
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'rgba(226, 232, 240, 0.95)' }}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'rgba(226, 232, 240, 0.95)' }}
              />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'rgba(226, 232, 240, 0.95)' }}
              />
            </div>
            {isDirty && <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>Unsaved changes</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleSave} disabled={saving || !isDirty} style={{ padding: '0.5rem 1rem', background: isDirty && !saving ? '#3b82f6' : 'rgba(148, 163, 184, 0.5)', color: '#fff', border: 'none', borderRadius: 8, cursor: saving || !isDirty ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={handleDiscardEdit} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, color: 'rgba(226, 232, 240, 0.95)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                Discard
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={rowStyle}>
              <div style={labelStyle}>Customer</div>
              <div style={valueStyle}>{bookingCustomerLabel(booking)}</div>
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>Start – End</div>
              <div style={valueStyle}>{formatTimeRange(booking.start_time, booking.end_time)}</div>
            </div>

            {(booking.duration_minutes || (booking.party_size && booking.party_size > 1) || booking.skill_level) && (
              <div style={{ ...rowStyle, padding: '0.75rem 1rem', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }}>
                <div style={{ ...labelStyle, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lesson details</div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {booking.duration_minutes && <span>Duration: {booking.duration_minutes} min</span>}
                  {booking.party_size != null && <span>Group size: {booking.party_size}</span>}
                  {booking.skill_level && <span>Skill level: {booking.skill_level}</span>}
                </div>
              </div>
            )}

            <div style={rowStyle}>
              <div style={labelStyle}>Status</div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  ...(isCancelled ? { background: 'rgba(239, 68, 68, 0.15)', color: 'rgba(252, 165, 165, 0.95)' }
                    : booking.status === 'modified' || booking.status === 'completed' ? { background: 'rgba(59, 130, 246, 0.15)', color: 'rgba(147, 197, 253, 0.95)' }
                    : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }),
                }}
              >
                {booking.status}
              </span>
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>Notes</div>
              <div style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{booking.notes ?? '—'}</div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Link href={`/instructor/booking-lifecycle?bookingId=${booking.id}`} style={{ fontSize: '0.875rem', color: '#7dd3fc', textDecoration: 'none' }}>View lifecycle</Link>
              {!isCancelled && (
                <button type="button" onClick={() => setEditing(true)} style={{ padding: '0.4rem 0.75rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, color: 'rgba(226, 232, 240, 0.95)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Edit
                </button>
              )}
            </div>

            {canCancelBooking && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => void handleCancelBooking()}
                  disabled={cancelling}
                  title="Permanently cancel this booking"
                  aria-label="Cancel booking — permanent and irreversible"
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(185, 28, 28, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    cursor: cancelling ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel booking (irreversible)'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p style={{ marginTop: '0.5rem' }}>
        <Link href="/instructor/bookings" style={{ color: '#7dd3fc', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to Bookings
        </Link>
      </p>
    </section>
  );
}
