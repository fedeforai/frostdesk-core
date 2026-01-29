import { sql } from './client.js';
import { BookingState } from './booking_state_machine.js';

export class BookingAuditWriteFailedError extends Error {
  code = 'BOOKING_AUDIT_WRITE_FAILED';
  
  constructor(bookingId: string, cause?: unknown) {
    super(`Failed to write audit log for booking: ${bookingId}`);
    this.name = 'BookingAuditWriteFailedError';
    this.cause = cause;
  }
}

export interface RecordBookingAuditParams {
  bookingId: string;
  previousState: BookingState;
  newState: BookingState;
  actor: 'system' | 'human';
}

/**
 * Records an audit log entry for a booking state change.
 * 
 * This function writes an immutable audit record to track booking state transitions.
 * It does not validate transitions, block mutations, or perform any business logic.
 * 
 * @param params - Audit record parameters
 * @throws BookingAuditWriteFailedError if the audit write fails
 */
export async function recordBookingAudit(params: RecordBookingAuditParams): Promise<void> {
  try {
    await sql`
      INSERT INTO booking_audit (booking_id, previous_state, new_state, actor, created_at)
      VALUES (${params.bookingId}, ${params.previousState}, ${params.newState}, ${params.actor}, NOW())
    `;
  } catch (error) {
    throw new BookingAuditWriteFailedError(params.bookingId, error);
  }
}
