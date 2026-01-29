import { assertAdminAccess, assertRoleAllowed } from './admin_access.js';
import { listAllBookings, AdminBookingSummary, ListAllBookingsParams } from './admin_booking_repository.js';
import { getBookingById as getAdminBookingById } from './admin_booking_detail_repository.js';
import { updateBookingState, BookingNotFoundError } from './booking_repository.js';
import { transitionBookingState, BookingState } from './booking_state_machine.js';
import { recordBookingAudit } from './booking_audit.js';
import { sql } from './client.js';

export interface GetAdminBookingsParams extends ListAllBookingsParams {
  userId: string;
}

export interface AdminOverrideBookingStatusParams {
  userId: string;
  bookingId: string;
  newStatus: BookingState;
  reason?: string;
}

/**
 * Retrieves bookings for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Call repository
 * 3. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of booking summaries
 * @throws UnauthorizedError if user is not an admin
 */
export async function getAdminBookings(
  params: GetAdminBookingsParams
): Promise<AdminBookingSummary[]> {
  const { userId, ...queryParams } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Call repository
  return listAllBookings(queryParams);
}

/**
 * Allows admin to manually override booking status.
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Fetch booking
 * 3. Validate transition via state machine
 * 4. Persist new state
 * 5. Write audit log with actor='human'
 * 
 * No calendar sync, no payment side-effects, no automation.
 * 
 * @param params - Override parameters
 * @returns Updated booking
 * @throws UnauthorizedError if user is not an admin
 * @throws BookingNotFoundError if booking does not exist
 * @throws InvalidBookingTransitionError if transition is invalid
 */
export async function adminOverrideBookingStatus(
  params: AdminOverrideBookingStatusParams
): Promise<AdminBookingSummary> {
  const { userId, bookingId, newStatus, reason } = params;

  // Assert role allowed (system_admin or human_approver)
  await assertRoleAllowed(userId, ['system_admin', 'human_approver']);

  // Fetch booking
  const booking = await getAdminBookingById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  // Validate transition via state machine
  const previousState = booking.status;
  transitionBookingState(previousState, newStatus);

  // Persist new state
  await updateBookingState(bookingId, newStatus);

  // Write audit log with actor='human'
  await recordBookingAudit({
    bookingId,
    previousState,
    newState: newStatus,
    actor: 'human',
  });

  // Query full booking details for admin view
  const result = await sql<AdminBookingSummary[]>`
    SELECT id, instructor_id, customer_name, phone, status, booking_date, start_time, end_time, calendar_event_id, payment_intent_id, created_at
    FROM bookings
    WHERE id = ${bookingId}
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(bookingId);
  }

  return result[0];
}
