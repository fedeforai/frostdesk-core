/**
 * Expire-check-on-read: when a pending booking is read and older than 24h, transition to declined.
 * No background workers; deterministic check on read/touch.
 * Source: docs/diagrams/BOOKING_STATE_MACHINE.mmd
 */

import { getBookingById } from './booking_repository.js';
import { updateBookingState } from './booking_repository.js';
import { recordBookingAudit } from './booking_audit.js';
import { transitionBookingState } from './booking_state_machine.js';
import type { BookingState } from './booking_state_machine.js';
import type { RecordBookingAuditParams } from './booking_audit.js';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export interface BookingRow {
  id: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Returns true if the given timestamp (ISO string or Date) is older than 24 hours.
 */
export function isPendingBookingExpired(createdAt: string | Date): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  return created < Date.now() - PENDING_TTL_MS;
}

/**
 * If the booking is pending and created_at is older than 24h, persists transition to declined
 * (updateBookingState + audit with actor=system) and returns the updated booking.
 * Otherwise returns the same booking.
 * Call after getBookingById (or when touching a booking) to apply expiry.
 */
export interface ApplyExpireCheckOnReadDeps<T = unknown> {
  updateBookingState: (bookingId: string, newStatus: BookingState) => Promise<T | null>;
  recordBookingAudit: (params: RecordBookingAuditParams) => Promise<void>;
  transitionBookingState: (currentState: BookingState, nextState: BookingState) => BookingState;
}

export async function applyExpireCheckOnRead<T extends BookingRow>(
  booking: T,
  _instructorId: string,
  deps: ApplyExpireCheckOnReadDeps<T>
): Promise<T> {
  if (booking.status !== 'pending') return booking;
  if (!isPendingBookingExpired(booking.created_at)) return booking;

  deps.transitionBookingState('pending', 'declined');
  await deps.recordBookingAudit({
    bookingId: booking.id,
    previousState: 'pending',
    newState: 'declined',
    actor: 'system',
  });
  const updated = await deps.updateBookingState(booking.id, 'declined');
  return (updated ?? { ...booking, status: 'declined' }) as T;
}

/**
 * Load booking by id for instructor, then apply expiry check (pending → declined if > 24h).
 * Used by transition endpoints so read-touch applies expiry before submit/accept/reject etc.
 */
export async function getBookingByIdWithExpiryCheck(
  bookingId: string,
  instructorId: string
): Promise<BookingRow | null> {
  const booking = await getBookingById(bookingId, instructorId);
  if (!booking) return null;
  return applyExpireCheckOnRead(booking as BookingRow, instructorId, {
    updateBookingState,
    recordBookingAudit,
    transitionBookingState,
  });
}
