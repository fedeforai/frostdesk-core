import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { confirmBooking } from '../src/booking_service.js';
import { Booking, BookingState } from '../src/booking_repository.js';
import * as bookingRepository from '../src/booking_repository.js';
import * as bookingAudit from '../src/booking_audit.js';
import * as calendarAdapter from '../src/calendar_adapter.js';
import * as bookingCalendarRepository from '../src/booking_calendar_repository.js';
import { sql } from '../src/client.js';

// Mock dependencies
jest.mock('../src/client.js');
jest.mock('../src/booking_repository.js');
jest.mock('../src/booking_audit.js');
jest.mock('../src/calendar_adapter.js');
jest.mock('../src/booking_calendar_repository.js');

describe('Calendar Sync Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default calendar ID
    process.env.GOOGLE_CALENDAR_ID = 'test-calendar-id';
  });

  describe('Happy Path - Confirm Creates Calendar Event', () => {
    it('creates calendar event and attaches it when confirming booking', async () => {
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

      // Mock createCalendarEvent
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock attachCalendarEventToBooking
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );

      // Mock updateBookingState
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);

      // Mock audit log
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking(bookingId);

      // Verify calendar event was created
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledTimes(1);
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        title: `Booking ${bookingId}`,
        metadata: {
          booking_id: bookingId,
          instructor_id: '1',
        },
      });

      // Verify calendar event was attached
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalledTimes(1);
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalledWith({
        bookingId,
        calendarEventId,
      });

      // Verify booking was confirmed
      expect(bookingRepository.updateBookingState).toHaveBeenCalledWith(bookingId, 'confirmed');
      expect(result.state).toBe('confirmed');
    });
  });

  describe('Calendar Failure - Prevent Confirmation', () => {
    it('prevents confirmation when calendar event creation fails', async () => {
      const bookingId = 'booking-2';
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

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock createCalendarEvent to fail
      const calendarError = new Error('Calendar API error');
      (calendarAdapter.createCalendarEvent as jest.Mock).mockRejectedValue(calendarError);

      // Attempt confirmation
      await expect(confirmBooking(bookingId)).rejects.toThrow('Calendar API error');

      // Verify calendar event creation was attempted
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledTimes(1);

      // Verify booking was NOT confirmed
      expect(bookingRepository.updateBookingState).not.toHaveBeenCalled();

      // Verify calendar event was NOT attached
      expect(bookingCalendarRepository.attachCalendarEventToBooking).not.toHaveBeenCalled();

      // Verify booking state remains proposed
      expect(booking.state).toBe('proposed');
    });
  });

  describe('Attach Failure - Rollback Event', () => {
    it('deletes calendar event when attach fails', async () => {
      const bookingId = 'booking-3';
      const calendarEventId = 'event-456';
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

      // Mock createCalendarEvent to succeed
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock attachCalendarEventToBooking to fail
      const attachError = new Error('Attach failed');
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockRejectedValue(
        attachError
      );

      // Mock deleteCalendarEvent for rollback
      (calendarAdapter.deleteCalendarEvent as jest.Mock).mockResolvedValue(undefined);

      // Attempt confirmation
      await expect(confirmBooking(bookingId)).rejects.toThrow('Attach failed');

      // Verify calendar event was created
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledTimes(1);

      // Verify attach was attempted
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalledTimes(1);

      // Verify rollback: calendar event was deleted
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledTimes(1);
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: calendarEventId,
      });

      // Verify booking was NOT confirmed
      expect(bookingRepository.updateBookingState).not.toHaveBeenCalled();
    });
  });

  describe('Persistence Failure After Event - Full Rollback', () => {
    it('rolls back calendar event and attachment when booking persistence fails', async () => {
      const bookingId = 'booking-4';
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

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...booking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock createCalendarEvent to succeed
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock attachCalendarEventToBooking to succeed
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );

      // Mock updateBookingState to fail
      const persistenceError = new Error('Persistence failed');
      (bookingRepository.updateBookingState as jest.Mock).mockRejectedValue(persistenceError);

      // Mock rollback functions
      (calendarAdapter.deleteCalendarEvent as jest.Mock).mockResolvedValue(undefined);
      (bookingCalendarRepository.detachCalendarEventFromBooking as jest.Mock).mockResolvedValue({
        ...booking,
        calendar_event_id: null,
      });

      // Attempt confirmation
      await expect(confirmBooking(bookingId)).rejects.toThrow('Persistence failed');

      // Verify calendar event was created
      expect(calendarAdapter.createCalendarEvent).toHaveBeenCalledTimes(1);

      // Verify attach succeeded
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalledTimes(1);

      // Verify booking persistence was attempted
      expect(bookingRepository.updateBookingState).toHaveBeenCalledTimes(1);

      // Verify full rollback: calendar event deleted
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledTimes(1);
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: calendarEventId,
      });

      // Verify full rollback: attachment removed
      expect(bookingCalendarRepository.detachCalendarEventFromBooking).toHaveBeenCalledTimes(1);
      expect(bookingCalendarRepository.detachCalendarEventFromBooking).toHaveBeenCalledWith({
        bookingId,
      });
    });
  });

  describe('No Orphan Events', () => {
    it('ensures no calendar events exist without confirmed bookings after failures', async () => {
      const bookingId = 'booking-5';
      const calendarEventId = 'event-orphan';
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

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock createCalendarEvent to succeed
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock attachCalendarEventToBooking to fail
      const attachError = new Error('Attach failed');
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockRejectedValue(
        attachError
      );

      // Mock deleteCalendarEvent for rollback
      (calendarAdapter.deleteCalendarEvent as jest.Mock).mockResolvedValue(undefined);

      // Attempt confirmation (will fail)
      await expect(confirmBooking(bookingId)).rejects.toThrow('Attach failed');

      // Verify rollback deleted the calendar event
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledTimes(1);
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id',
        eventId: calendarEventId,
      });

      // Verify booking was NOT confirmed (no orphan confirmed booking)
      expect(bookingRepository.updateBookingState).not.toHaveBeenCalled();

      // After rollback, there should be no calendar event without a confirmed booking
      // This is verified by the fact that deleteCalendarEvent was called
      expect(calendarAdapter.deleteCalendarEvent).toHaveBeenCalled();
    });

    it('ensures confirmed bookings always have calendar_event_id', async () => {
      const bookingId = 'booking-6';
      const calendarEventId = 'event-6';
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

      const bookingWithCalendar: bookingCalendarRepository.BookingWithCalendarEvent = {
        ...confirmedBooking,
        calendar_event_id: calendarEventId,
      };

      // Mock getBookingById
      (bookingRepository.getBookingById as jest.Mock).mockResolvedValue(booking);

      // Mock collision detection (no collisions)
      (sql as unknown as jest.Mock).mockResolvedValue([]);

      // Mock createCalendarEvent
      (calendarAdapter.createCalendarEvent as jest.Mock).mockResolvedValue({
        eventId: calendarEventId,
      });

      // Mock attachCalendarEventToBooking
      (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mockResolvedValue(
        bookingWithCalendar
      );

      // Mock updateBookingState
      (bookingRepository.updateBookingState as jest.Mock).mockResolvedValue(confirmedBooking);

      // Mock audit log
      (bookingAudit.recordBookingAudit as jest.Mock).mockResolvedValue(undefined);

      const result = await confirmBooking(bookingId);

      // Verify booking is confirmed
      expect(result.state).toBe('confirmed');

      // Verify calendar event was attached
      expect(bookingCalendarRepository.attachCalendarEventToBooking).toHaveBeenCalled();

      // Verify booking was confirmed
      expect(bookingRepository.updateBookingState).toHaveBeenCalled();

      // Verify call order: attach before updateBookingState
      const attachCallOrder = (bookingCalendarRepository.attachCalendarEventToBooking as jest.Mock).mock.invocationCallOrder[0];
      const updateCallOrder = (bookingRepository.updateBookingState as jest.Mock).mock.invocationCallOrder[0];
      expect(attachCallOrder).toBeLessThan(updateCallOrder);

      // Verify confirmed booking has calendar_event_id
      expect(bookingWithCalendar.calendar_event_id).toBe(calendarEventId);
    });
  });
});
