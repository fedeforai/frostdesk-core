import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { transitionBookingState, InvalidBookingTransitionError, BookingState } from '../src/booking_state_machine.js';
import {
  createDraftBooking,
  proposeBookingSlots,
  confirmBooking,
  cancelBooking,
  expireBooking,
  BookingCollisionError,
} from '../src/booking_service.js';
import * as bookingRepository from '../src/booking_repository.js';
import * as bookingAudit from '../src/booking_audit.js';
import { sql } from '../src/client.js';

// Mock dependencies
jest.mock('../src/client.js');
jest.mock('../src/booking_repository.js');
jest.mock('../src/booking_audit.js');

describe('Booking Engine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('State Machine - Valid Transitions', () => {
    it('allows draft → proposed transition', () => {
      const result = transitionBookingState('draft', 'proposed');
      expect(result).toBe('proposed');
    });

    it('allows proposed → confirmed transition', () => {
      const result = transitionBookingState('proposed', 'confirmed');
      expect(result).toBe('confirmed');
    });

    it('allows proposed → expired transition', () => {
      const result = transitionBookingState('proposed', 'expired');
      expect(result).toBe('expired');
    });

    it('allows confirmed → cancelled transition', () => {
      const result = transitionBookingState('confirmed', 'cancelled');
      expect(result).toBe('cancelled');
    });
  });

  describe('State Machine - Invalid Transitions', () => {
    it('throws INVALID_BOOKING_TRANSITION for draft → confirmed', () => {
      expect(() => {
        transitionBookingState('draft', 'confirmed');
      }).toThrow(InvalidBookingTransitionError);
      
      try {
        transitionBookingState('draft', 'confirmed');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidBookingTransitionError);
        expect((error as InvalidBookingTransitionError).code).toBe('INVALID_BOOKING_TRANSITION');
      }
    });

    it('throws INVALID_BOOKING_TRANSITION for draft → cancelled', () => {
      expect(() => {
        transitionBookingState('draft', 'cancelled');
      }).toThrow(InvalidBookingTransitionError);
      
      try {
        transitionBookingState('draft', 'cancelled');
      } catch (error) {
        expect((error as InvalidBookingTransitionError).code).toBe('INVALID_BOOKING_TRANSITION');
      }
    });

    it('throws INVALID_BOOKING_TRANSITION for expired → confirmed', () => {
      expect(() => {
        transitionBookingState('expired', 'confirmed');
      }).toThrow(InvalidBookingTransitionError);
      
      try {
        transitionBookingState('expired', 'confirmed');
      } catch (error) {
        expect((error as InvalidBookingTransitionError).code).toBe('INVALID_BOOKING_TRANSITION');
      }
    });

    it('throws INVALID_BOOKING_TRANSITION for cancelled → proposed', () => {
      expect(() => {
        transitionBookingState('cancelled', 'proposed');
      }).toThrow(InvalidBookingTransitionError);
      
      try {
        transitionBookingState('cancelled', 'proposed');
      } catch (error) {
        expect((error as InvalidBookingTransitionError).code).toBe('INVALID_BOOKING_TRANSITION');
      }
    });
  });

  describe('Booking Creation - Idempotency', () => {
    it('returns same booking when createDraftBooking called twice with same idempotency_key', async () => {
      const idempotencyKey = 'test-key-123';
      const mockBooking = {
        id: 'booking-1',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'draft' as BookingState,
        idempotency_key: idempotencyKey,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      // First call creates booking
      (bookingRepository.getBookingByIdempotencyKey as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBooking);
      
      (bookingRepository.createBooking as jest.Mock).mockResolvedValueOnce(mockBooking);

      const input = {
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        idempotency_key: idempotencyKey,
      };

      const firstResult = await createDraftBooking(input);
      expect(firstResult.id).toBe('booking-1');
      expect(bookingRepository.createBooking).toHaveBeenCalledTimes(1);

      // Second call returns existing booking
      const secondResult = await createDraftBooking(input);
      expect(secondResult.id).toBe('booking-1');
      expect(secondResult.idempotency_key).toBe(idempotencyKey);
      // createBooking should not be called again (idempotency check returns existing)
      expect(bookingRepository.getBookingByIdempotencyKey).toHaveBeenCalledWith(idempotencyKey);
    });

    it('does not create duplicate bookings with same idempotency_key', async () => {
      const idempotencyKey = 'test-key-456';
      const mockBooking = {
        id: 'booking-2',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'draft' as BookingState,
        idempotency_key: idempotencyKey,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      // First call: no existing booking, creates new
      (bookingRepository.getBookingByIdempotencyKey as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBooking); // Second call finds existing
      
      (bookingRepository.createBooking as jest.Mock).mockResolvedValueOnce(mockBooking);

      const input = {
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        idempotency_key: idempotencyKey,
      };

      await createDraftBooking(input);
      const secondResult = await createDraftBooking(input);

      // Second call should return existing, not create new
      expect(secondResult.id).toBe('booking-2');
      expect(bookingRepository.createBooking).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Collision Detection - Blocking Confirm', () => {
    it('throws BOOKING_COLLISION when confirming overlapping booking', async () => {
      const instructorId = 1;
      const booking1 = {
        id: 'booking-1',
        instructor_id: instructorId,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'confirmed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const booking2 = {
        id: 'booking-2',
        instructor_id: instructorId,
        start_time: '2024-01-01T11:00:00Z', // Overlaps with booking1
        end_time: '2024-01-01T13:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-2',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      // Mock getBookingById to return booking2
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking2);

      // Mock sql query to return booking1 (overlapping booking)
      (sql as unknown as jest.Mock).mockResolvedValue([booking1]);

      await expect(confirmBooking('booking-2')).rejects.toThrow(BookingCollisionError);
      
      try {
        await confirmBooking('booking-2');
      } catch (error) {
        expect(error).toBeInstanceOf(BookingCollisionError);
        expect((error as BookingCollisionError).code).toBe('BOOKING_COLLISION');
      }
    });
  });

  describe('Collision Detection - Allowed Non-Overlap', () => {
    it('allows confirming non-overlapping bookings for same instructor', async () => {
      const instructorId = 1;
      const booking1 = {
        id: 'booking-1',
        instructor_id: instructorId,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'confirmed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const booking2 = {
        id: 'booking-2',
        instructor_id: instructorId,
        start_time: '2024-01-01T14:00:00Z', // No overlap (after booking1 ends)
        end_time: '2024-01-01T16:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-2',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedBooking2 = {
        ...booking2,
        state: 'confirmed' as BookingState,
      };

      // Mock getBookingById to return booking2
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking2);

      // Mock sql query to return booking1 (non-overlapping)
      (sql as unknown as jest.Mock).mockResolvedValue([booking1]);

      // Mock updateBookingState to return confirmed booking
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedBooking2);

      // Mock audit log
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking('booking-2');

      expect(result.state).toBe('confirmed');
      expect(bookingRepository.updateBookingState).toHaveBeenCalledWith('booking-2', 'confirmed');
      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'booking-2',
        previousState: 'proposed',
        newState: 'confirmed',
        actor: 'system',
      });
    });
  });

  describe('Collision Detection - Ignored States', () => {
    it('ignores cancelled bookings in collision detection', async () => {
      const instructorId = 1;
      const cancelledBooking = {
        id: 'booking-cancelled',
        instructor_id: instructorId,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'cancelled' as BookingState,
        idempotency_key: 'key-cancelled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const newBooking = {
        id: 'booking-new',
        instructor_id: instructorId,
        start_time: '2024-01-01T11:00:00Z', // Overlaps with cancelled booking
        end_time: '2024-01-01T13:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-new',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedNewBooking = {
        ...newBooking,
        state: 'confirmed' as BookingState,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(newBooking);

      // Mock sql query - should return empty array because cancelled bookings are filtered out
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock updateBookingState
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedNewBooking);

      // Mock audit log
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      // Should succeed because cancelled booking is ignored
      const result = await confirmBooking('booking-new');
      expect(result.state).toBe('confirmed');
    });

    it('ignores expired bookings in collision detection', async () => {
      const instructorId = 1;
      const expiredBooking = {
        id: 'booking-expired',
        instructor_id: instructorId,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'expired' as BookingState,
        idempotency_key: 'key-expired',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const newBooking = {
        id: 'booking-new',
        instructor_id: instructorId,
        start_time: '2024-01-01T11:00:00Z', // Overlaps with expired booking
        end_time: '2024-01-01T13:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-new',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedNewBooking = {
        ...newBooking,
        state: 'confirmed' as BookingState,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(newBooking);

      // Mock sql query - should return empty array because expired bookings are filtered out
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock updateBookingState
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedNewBooking);

      // Mock audit log
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      // Should succeed because expired booking is ignored
      const result = await confirmBooking('booking-new');
      expect(result.state).toBe('confirmed');
    });
  });

  describe('Audit Log - Written on Mutations', () => {
    it('writes audit log when proposing booking slots', async () => {
      const booking = {
        id: 'booking-1',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'draft' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedBooking = {
        ...booking,
        state: 'proposed' as BookingState,
      };

      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      await proposeBookingSlots('booking-1', [{ startTime: new Date(), endTime: new Date() }]);

      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledTimes(1);
      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        previousState: 'draft',
        newState: 'proposed',
        actor: 'system',
      });
    });

    it('writes audit log when confirming booking', async () => {
      const booking = {
        id: 'booking-1',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedBooking = {
        ...booking,
        state: 'confirmed' as BookingState,
      };

      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);
      (sql as unknown as jest.Mock).mockResolvedValue([]); // No collisions
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      await confirmBooking('booking-1');

      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledTimes(1);
      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        previousState: 'proposed',
        newState: 'confirmed',
        actor: 'system',
      });
    });

    it('writes audit log when cancelling booking', async () => {
      const booking = {
        id: 'booking-1',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'confirmed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedBooking = {
        ...booking,
        state: 'cancelled' as BookingState,
      };

      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      await cancelBooking('booking-1');

      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledTimes(1);
      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        previousState: 'confirmed',
        newState: 'cancelled',
        actor: 'system',
      });
    });

    it('writes audit log when expiring booking', async () => {
      const booking = {
        id: 'booking-1',
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const updatedBooking = {
        ...booking,
        state: 'expired' as BookingState,
      };

      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(updatedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      await expireBooking('booking-1');

      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledTimes(1);
      expect(bookingAudit.recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'booking-1',
        previousState: 'proposed',
        newState: 'expired',
        actor: 'system',
      });
    });
  });
});
