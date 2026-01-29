import { assertAdminAccess } from './admin_access.js';
import { getBookingLifecycle, type BookingLifecycleEvent } from './booking_lifecycle_repository.js';

/**
 * Admin-only service wrapper for booking lifecycle timeline.
 *
 * WHAT IT DOES:
 * - Enforces admin access
 * - Returns read-only lifecycle events
 *
 * WHAT IT DOES NOT DO:
 * - No mutation
 * - No enrichment
 * - No inference
 * 
 * @param bookingId - UUID of the booking
 * @param userId - Authenticated user ID (for access control)
 * @returns Array of lifecycle events ordered by timestamp ASC
 * @throws UnauthorizedError if user is not admin
 * @throws BookingNotFoundError if booking does not exist
 */
export async function getBookingLifecycleAdmin(
  bookingId: string,
  userId: string
): Promise<BookingLifecycleEvent[]> {
  // Guard: admin only
  await assertAdminAccess(userId);

  // Delegate to repository
  return getBookingLifecycle(bookingId);
}
