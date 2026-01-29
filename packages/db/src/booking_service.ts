import {
  createBooking,
  getBookingById,
  listInstructorBookings,
} from './booking_repository.js';

/**
 * Creates a new booking.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param payload - Booking data
 * @returns Created booking ID
 */
export async function createBookingService(
  userId: string,
  payload: {
    customerName: string;
    startTime: string;
    endTime: string;
    serviceId?: string | null;
    meetingPointId?: string | null;
    notes?: string | null;
  }
): Promise<{ id: string }> {
  return createBooking({
    instructorId: userId,
    customerName: payload.customerName,
    startTime: payload.startTime,
    endTime: payload.endTime,
    serviceId: payload.serviceId,
    meetingPointId: payload.meetingPointId,
    notes: payload.notes,
  });
}

/**
 * Retrieves a booking by its ID.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param bookingId - Booking ID
 * @returns Booking row or null if not found
 */
export async function getBookingService(
  userId: string,
  bookingId: string
): Promise<any | null> {
  return getBookingById(bookingId, userId);
}

/**
 * Lists all bookings for an instructor.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of booking rows
 */
export async function listInstructorBookingsService(
  userId: string
): Promise<any[]> {
  return listInstructorBookings(userId);
}
