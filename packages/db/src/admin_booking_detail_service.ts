import { assertAdminAccess } from './admin_access.js';
import { getBookingById, getBookingAuditTrail, AdminBookingDetail, BookingAuditEntry } from './admin_booking_detail_repository.js';
import { BookingNotFoundError } from './booking_repository.js';

export interface GetAdminBookingDetailParams {
  userId: string;
  bookingId: string;
}

export interface AdminBookingDetailResult {
  booking: AdminBookingDetail;
  auditTrail: BookingAuditEntry[];
}

/**
 * Retrieves complete booking details with audit trail for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Fetch booking
 * 3. Fetch audit log for booking
 * 4. Return aggregated result
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Booking details with audit trail
 * @throws UnauthorizedError if user is not an admin
 * @throws BookingNotFoundError if booking does not exist
 */
export async function getAdminBookingDetail(
  params: GetAdminBookingDetailParams
): Promise<AdminBookingDetailResult> {
  const { userId, bookingId } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Fetch booking
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  // Fetch audit trail
  const auditTrail = await getBookingAuditTrail(bookingId);

  // Return aggregated result
  return {
    booking,
    auditTrail,
  };
}
