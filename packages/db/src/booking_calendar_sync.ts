/**
 * Booking ↔ Google Calendar Sync Service
 *
 * Multi-tenant: uses per-instructor OAuth tokens from instructor_calendar_connections.
 * Handles token refresh, event create/update/delete, and error-resilient sync.
 *
 * Policy on Calendar failure:
 *   - Booking state is NOT rolled back (DB is source of truth).
 *   - Audit event with severity 'warn' is logged.
 *   - Caller receives { calendarSynced: false, calendarError } so the API can
 *     surface a non-blocking warning to the instructor.
 */

import { getInstructorCalendarConnection, upsertInstructorCalendarConnection } from './instructor_calendar_repository.js';
import { attachCalendarEventToBooking, detachCalendarEventFromBooking, getCalendarEventForBooking } from './booking_calendar_repository.js';
import { insertAuditEvent } from './audit_log_repository.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CalendarSyncResult {
  calendarSynced: boolean;
  calendarEventId?: string | null;
  calendarError?: string | null;
}

interface BookingForCalendar {
  id: string;
  instructor_id: string;
  start_time: string;
  end_time: string;
  customer_name?: string | null;
  notes?: string | null;
}

interface TokenInfo {
  accessToken: string;
  calendarId: string;
}

// ── Token management ─────────────────────────────────────────────────────────

async function getValidToken(instructorId: string): Promise<TokenInfo | null> {
  const conn = await getInstructorCalendarConnection(instructorId);
  if (!conn) return null;

  const now = new Date();
  const expiresAt = conn.expires_at ? new Date(conn.expires_at) : null;
  const isExpired = expiresAt && expiresAt.getTime() <= now.getTime() + 60_000;

  if (!isExpired) {
    return { accessToken: conn.access_token, calendarId: conn.calendar_id };
  }

  if (!conn.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const formData = new URLSearchParams();
  formData.append('refresh_token', conn.refresh_token);
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  formData.append('grant_type', 'refresh_token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const result = await response.json() as {
    access_token: string;
    expires_in: number;
  };

  const newExpiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();
  await upsertInstructorCalendarConnection({
    instructorId: conn.instructor_id,
    provider: conn.provider,
    access_token: result.access_token,
    refresh_token: conn.refresh_token,
    calendar_id: conn.calendar_id,
    expires_at: newExpiresAt,
  });

  return { accessToken: result.access_token, calendarId: conn.calendar_id };
}

// ── Google Calendar API helpers ──────────────────────────────────────────────

function buildEventTitle(customerName: string | null | undefined): string {
  return customerName ? `Lezione – ${customerName}` : 'Lezione';
}

async function googleCreateEvent(
  token: TokenInfo,
  booking: BookingForCalendar,
): Promise<string> {
  const event = {
    summary: buildEventTitle(booking.customer_name),
    description: booking.notes ?? undefined,
    start: { dateTime: new Date(booking.start_time).toISOString(), timeZone: 'UTC' },
    end: { dateTime: new Date(booking.end_time).toISOString(), timeZone: 'UTC' },
    extendedProperties: {
      private: { frostdesk_booking_id: booking.id },
    },
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(token.calendarId)}/events`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar create failed: ${response.status} ${errorText}`);
  }

  const result = await response.json() as { id: string };
  return result.id;
}

async function googleUpdateEvent(
  token: TokenInfo,
  eventId: string,
  booking: BookingForCalendar,
): Promise<void> {
  const event = {
    summary: buildEventTitle(booking.customer_name),
    description: booking.notes ?? undefined,
    start: { dateTime: new Date(booking.start_time).toISOString(), timeZone: 'UTC' },
    end: { dateTime: new Date(booking.end_time).toISOString(), timeZone: 'UTC' },
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(token.calendarId)}/events/${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar update failed: ${response.status} ${errorText}`);
  }
}

async function googleDeleteEvent(
  token: TokenInfo,
  eventId: string,
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(token.calendarId)}/events/${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token.accessToken}` },
  });

  if (!response.ok && response.status !== 410) {
    const errorText = await response.text();
    throw new Error(`Google Calendar delete failed: ${response.status} ${errorText}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event for a confirmed booking.
 * Saves calendar_event_id on the booking. Idempotent: if calendar_event_id
 * already exists, returns it without creating a duplicate.
 */
export async function syncBookingToCalendar(
  booking: BookingForCalendar,
): Promise<CalendarSyncResult> {
  try {
    const existing = await getCalendarEventForBooking(booking.id);
    if (existing.calendarEventId) {
      return { calendarSynced: true, calendarEventId: existing.calendarEventId };
    }

    const token = await getValidToken(booking.instructor_id);
    if (!token) {
      return { calendarSynced: false, calendarError: 'no_calendar_connection' };
    }

    const eventId = await googleCreateEvent(token, booking);
    await attachCalendarEventToBooking({ bookingId: booking.id, calendarEventId: eventId });

    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_event_created',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'info',
        payload: {
          calendar_event_id: eventId,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: true, calendarEventId: eventId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_sync_failed',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'warn',
        payload: {
          operation: 'create',
          error: errorMsg,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: false, calendarError: errorMsg };
  }
}

/**
 * Updates the Google Calendar event when a booking is modified.
 * No-op if no calendar_event_id is linked.
 */
export async function syncBookingUpdateToCalendar(
  booking: BookingForCalendar,
): Promise<CalendarSyncResult> {
  try {
    const existing = await getCalendarEventForBooking(booking.id);
    if (!existing.calendarEventId) {
      return { calendarSynced: false, calendarError: 'no_calendar_event_linked' };
    }

    const token = await getValidToken(booking.instructor_id);
    if (!token) {
      return { calendarSynced: false, calendarError: 'no_calendar_connection' };
    }

    await googleUpdateEvent(token, existing.calendarEventId, booking);

    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_event_updated',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'info',
        payload: {
          calendar_event_id: existing.calendarEventId,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: true, calendarEventId: existing.calendarEventId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_sync_failed',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'warn',
        payload: {
          operation: 'update',
          error: errorMsg,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: false, calendarError: errorMsg };
  }
}

/**
 * Deletes the Google Calendar event when a booking is cancelled.
 * Clears calendar_event_id on the booking. No-op if no event is linked.
 */
export async function syncBookingCancelToCalendar(
  booking: BookingForCalendar,
): Promise<CalendarSyncResult> {
  try {
    const existing = await getCalendarEventForBooking(booking.id);
    if (!existing.calendarEventId) {
      return { calendarSynced: true };
    }

    const token = await getValidToken(booking.instructor_id);
    if (!token) {
      return { calendarSynced: false, calendarError: 'no_calendar_connection' };
    }

    await googleDeleteEvent(token, existing.calendarEventId);
    await detachCalendarEventFromBooking({ bookingId: booking.id });

    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_event_deleted',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'info',
        payload: {
          calendar_event_id: existing.calendarEventId,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'calendar_sync_failed',
        entity_type: 'booking',
        entity_id: booking.id,
        severity: 'warn',
        payload: {
          operation: 'delete',
          error: errorMsg,
          instructor_id: booking.instructor_id,
        },
      });
    } catch { /* fail-open */ }

    return { calendarSynced: false, calendarError: errorMsg };
  }
}
