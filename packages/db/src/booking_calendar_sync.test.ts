/**
 * Tests for Booking ↔ Google Calendar Sync Service.
 * All Google Calendar API calls and DB operations are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetInstructorCalendarConnection = vi.fn();
const mockUpsertInstructorCalendarConnection = vi.fn();
const mockAttachCalendarEventToBooking = vi.fn();
const mockDetachCalendarEventFromBooking = vi.fn();
const mockGetCalendarEventForBooking = vi.fn();
const mockInsertAuditEvent = vi.fn();

vi.mock('./instructor_calendar_repository.js', () => ({
  getInstructorCalendarConnection: (...args: unknown[]) => mockGetInstructorCalendarConnection(...args),
  upsertInstructorCalendarConnection: (...args: unknown[]) => mockUpsertInstructorCalendarConnection(...args),
}));

vi.mock('./booking_calendar_repository.js', () => ({
  attachCalendarEventToBooking: (...args: unknown[]) => mockAttachCalendarEventToBooking(...args),
  detachCalendarEventFromBooking: (...args: unknown[]) => mockDetachCalendarEventFromBooking(...args),
  getCalendarEventForBooking: (...args: unknown[]) => mockGetCalendarEventForBooking(...args),
}));

vi.mock('./audit_log_repository.js', () => ({
  insertAuditEvent: (...args: unknown[]) => mockInsertAuditEvent(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  syncBookingToCalendar,
  syncBookingUpdateToCalendar,
  syncBookingCancelToCalendar,
} from './booking_calendar_sync.js';

const BOOKING = {
  id: 'booking-1',
  instructor_id: 'instructor-1',
  start_time: '2026-03-01T10:00:00Z',
  end_time: '2026-03-01T12:00:00Z',
  customer_name: 'Sara Johnson',
  notes: 'Beginner lesson',
};

const CALENDAR_CONNECTION = {
  id: 'conn-1',
  instructor_id: 'instructor-1',
  provider: 'google',
  access_token: 'valid-token',
  refresh_token: 'refresh-token',
  calendar_id: 'primary',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('syncBookingToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertAuditEvent.mockResolvedValue(undefined);
  });

  it('creates event and attaches to booking', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: null });
    mockGetInstructorCalendarConnection.mockResolvedValue(CALENDAR_CONNECTION);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'gcal-event-123' }),
    });
    mockAttachCalendarEventToBooking.mockResolvedValue(undefined);

    const result = await syncBookingToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
    expect(result.calendarEventId).toBe('gcal-event-123');
    expect(mockAttachCalendarEventToBooking).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      calendarEventId: 'gcal-event-123',
    });
    expect(mockInsertAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'calendar_event_created' }),
    );
  });

  it('returns existing event if already linked (idempotent)', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: 'existing-event' });

    const result = await syncBookingToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
    expect(result.calendarEventId).toBe('existing-event');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns not synced when no calendar connection', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: null });
    mockGetInstructorCalendarConnection.mockResolvedValue(null);

    const result = await syncBookingToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(false);
    expect(result.calendarError).toBe('no_calendar_connection');
  });

  it('handles Google API error gracefully', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: null });
    mockGetInstructorCalendarConnection.mockResolvedValue(CALENDAR_CONNECTION);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const result = await syncBookingToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(false);
    expect(result.calendarError).toContain('403');
    expect(mockInsertAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'calendar_sync_failed' }),
    );
  });
});

describe('syncBookingUpdateToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertAuditEvent.mockResolvedValue(undefined);
  });

  it('updates event on Google Calendar', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: 'gcal-event-123' });
    mockGetInstructorCalendarConnection.mockResolvedValue(CALENDAR_CONNECTION);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await syncBookingUpdateToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
    expect(result.calendarEventId).toBe('gcal-event-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('gcal-event-123'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('returns not synced when no event is linked', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: null });

    const result = await syncBookingUpdateToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(false);
    expect(result.calendarError).toBe('no_calendar_event_linked');
  });
});

describe('syncBookingCancelToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertAuditEvent.mockResolvedValue(undefined);
  });

  it('deletes event and detaches from booking', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: 'gcal-event-123' });
    mockGetInstructorCalendarConnection.mockResolvedValue(CALENDAR_CONNECTION);
    mockFetch.mockResolvedValue({ ok: true });
    mockDetachCalendarEventFromBooking.mockResolvedValue(undefined);

    const result = await syncBookingCancelToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
    expect(mockDetachCalendarEventFromBooking).toHaveBeenCalledWith({ bookingId: 'booking-1' });
    expect(mockInsertAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'calendar_event_deleted' }),
    );
  });

  it('succeeds when no event is linked (no-op)', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: null });

    const result = await syncBookingCancelToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles 410 Gone gracefully', async () => {
    mockGetCalendarEventForBooking.mockResolvedValue({ calendarEventId: 'gcal-event-123' });
    mockGetInstructorCalendarConnection.mockResolvedValue(CALENDAR_CONNECTION);
    mockFetch.mockResolvedValue({ ok: false, status: 410, text: async () => 'Gone' });
    mockDetachCalendarEventFromBooking.mockResolvedValue(undefined);

    const result = await syncBookingCancelToCalendar(BOOKING);

    expect(result.calendarSynced).toBe(true);
  });
});
