import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { confirmBooking } from '../src/booking_service.js';
import { Booking, BookingState } from '../src/booking_repository.js';
import * as bookingRepository from '../src/booking_repository.js';
import * as bookingAudit from '../src/booking_audit.js';
import * as calendarAdapter from '../src/calendar_adapter.js';
import * as bookingCalendarRepository from '../src/booking_calendar_repository.js';
import * as bookingPaymentRepository from '../src/booking_payment_repository.js';
import * as paymentAdapter from '../src/payment_adapter.js';
import { sql } from '../src/client.js';

// Mock dependencies
jest.mock('../src/client.js');
jest.mock('../src/booking_repository.js');
jest.mock('../src/booking_audit.js');
jest.mock('../src/calendar_adapter.js');
jest.mock('../src/booking_calendar_repository.js');
jest.mock('../src/booking_payment_repository.js');
jest.mock('../src/payment_adapter.js');

describe('Payment Wiring Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default calendar ID
    process.env.GOOGLE_CALENDAR_ID = 'test-calendar-id';
  });

  describe('Confirm Without Payment - Allowed', () => {
    it('confirms booking without paymentIntentId', async () => {
      const bookingId = 'booking-1';
      const calendarEventId = 'event-123';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const confirmedBooking: Booking = {
        ...booking,
        state: 'confirmed' as BookingState,
      };

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...confirmedBooking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock calendar sync
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking({ bookingId });

      // Verify booking is confirmed
      expect(result.state).toBe('confirmed');

      // Verify payment intent was NOT attached
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).not.toHaveBeenCalled();

      // Verify calendar sync still works
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalled();
      expect(bookingRepository.updateBookingState).toHaveBeenCalledWith(bookingId, 'confirmed');
    });
  });

  describe('Confirm With Payment - Wiring Works', () => {
    it('attaches payment intent when paymentIntentId is provided', async () => {
      const bookingId = 'booking-2';
      const paymentIntentId = 'pi_1234567890';
      const calendarEventId = 'event-456';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-2',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const confirmedBooking: Booking = {
        ...booking,
        state: 'confirmed' as BookingState,
      };

      const bookingWithPayment: bookingPaymentRepository.BookingWithPaymentIntent = {
        ...booking,
        payment_intent_id: paymentIntentId,
      };

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...confirmedBooking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock payment attach
      (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mockResolvedValue(
        bookingWithPayment
      );

      // Mock calendar sync
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking({ bookingId, paymentIntentId });

      // Verify payment intent was attached
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalledTimes(1);
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalledWith({
        bookingId,
        paymentIntentId,
      });

      // Verify booking is confirmed
      expect(result.state).toBe('confirmed');

      // Verify call order: payment attach before calendar sync
      const paymentAttachCallOrder = (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mock.invocationCallOrder[0];
      const calendarCreateCallOrder = (calendarAdapter.createCalendarEvent as jest.Mock).mock.invocationCallOrder[0];
      expect(paymentAttachCallOrder).toBeLessThan(calendarCreateCallOrder);
    });
  });

  describe('Payment Attach Failure - Prevent Confirmation', () => {
    it('prevents confirmation when payment attach fails', async () => {
      const bookingId = 'booking-3';
      const paymentIntentId = 'pi_fail';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-3',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock payment attach to fail
      const attachError = new Error('Payment attach failed');
      (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mockRejectedValue(
        attachError
      );

      // Attempt confirmation
      await expect(confirmBooking({ bookingId, paymentIntentId })).rejects.toThrow(
        'Payment attach failed'
      );

      // Verify payment attach was attempted
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalledTimes(1);

      // Verify booking was NOT confirmed
      expect(bookingRepository.updateBookingState).not.toHaveBeenCalled();

      // Verify calendar sync was NOT executed
      expect(calendarAdapter.createCalendarEvent).not.toHaveBeenCalled();
      expect(bookingCalendarRepository.attachCalendarEventToBooking).not.toHaveBeenCalled();
    });
  });

  describe('No Gating - Payment Status Ignored', () => {
    it('does not check payment status when paymentIntentId is provided', async () => {
      const bookingId = 'booking-4';
      const paymentIntentId = 'pi_any_status';
      const calendarEventId = 'event-789';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-4',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const confirmedBooking: Booking = {
        ...booking,
        state: 'confirmed' as BookingState,
      };

      const bookingWithPayment: bookingPaymentRepository.BookingWithPaymentIntent = {
        ...booking,
        payment_intent_id: paymentIntentId,
      };

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...confirmedBooking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock payment attach
      (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mockResolvedValue(
        bookingWithPayment
      );

      // Mock calendar sync
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking({ bookingId, paymentIntentId });

      // Verify payment status was NOT checked
      expect(paymentAdapter.getPaymentIntent).not.toHaveBeenCalled();

      // Verify booking is confirmed regardless
      expect(result.state).toBe('confirmed');

      // Verify payment was attached
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalled();
    });
  });

  describe('Calendar Sync Still Works With Payment', () => {
    it('calendar sync and rollback work correctly when payment is attached', async () => {
      const bookingId = 'booking-5';
      const paymentIntentId = 'pi_123';
      const calendarEventId = 'event-999';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-5',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const bookingWithPayment: bookingPaymentRepository.BookingWithPaymentIntent = {
        ...booking,
        payment_intent_id: paymentIntentId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock payment attach to succeed
      (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mockResolvedValue(
        bookingWithPayment
      );

      // Mock calendar event creation to succeed
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock calendar attach to fail (testing rollback)
      const calendarAttachError = new Error('Calendar attach failed');
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockRejectedValue(
        calendarAttachError
      );

      // Mock calendar event deletion for rollback
      (calendarAdapter.deleteCalendarEvent as jest.Mock).mockResolvedValue(undefined);

      // Attempt confirmation (will fail at calendar attach)
      await expect(confirmBooking({ bookingId, paymentIntentId })).rejects.toThrow(
        'Calendar attach failed'
      );

      // Verify payment was attached (before calendar sync)
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalledTimes(1);

      // Verify calendar event was created
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledTimes(1);

      // Verify calendar attach was attempted
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalledTimes(1);

      // Verify rollback: calendar event was deleted
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledTimes(1);
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: calendarEventId,
      });

      // Verify booking was NOT confirmed
      expect(bookingRepository.updateBookingState).not.toHaveBeenCalled();

      // Verify payment attachment remains (no rollback needed for payment, it's just a reference)
      // This is expected behavior - payment attachment doesn't need rollback
    });

    it('calendar sync succeeds when payment is attached', async () => {
      const bookingId = 'booking-6';
      const paymentIntentId = 'pi_456';
      const calendarEventId = 'event-success';
      const booking: Booking = {
        id: bookingId,
        instructor_id: 1,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        state: 'proposed' as BookingState,
        idempotency_key: 'key-6',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      const confirmedBooking: Booking = {
        ...booking,
        state: 'confirmed' as BookingState,
      };

      const bookingWithPayment: bookingPaymentRepository.BookingWithPaymentIntent = {
        ...booking,
        payment_intent_id: paymentIntentId,
      };

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...confirmedBooking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock payment attach
      (bookingPaymentRepository.attachPaymentIntentToBooking as jest.Mock).mockResolvedValue(
        bookingWithPayment
      );

      // Mock calendar sync
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking({ bookingId, paymentIntentId });

      // Verify payment was attached
      expect(bookingPaymentRepository.attachPaymentIntentToBooking).toHaveBeenCalled();

      // Verify calendar sync completed
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalled();
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalled();

      // Verify booking is confirmed
      expect(result.state).toBe('confirmed');
      expect(bookingRepository.updateBookingState).toHaveBeenCalledWith(bookingId, 'confirmed');
    });
  });
});
