import {
  getInstructorCalendarConnection,
  upsertInstructorCalendarConnection,
  deleteInstructorCalendarConnection,
  type InstructorCalendarConnection,
  type UpsertInstructorCalendarConnectionParams,
} from './instructor_calendar_repository.js';
import {
  clearInstructorEvents,
  insertCalendarEvents,
  listInstructorEvents,
  type CalendarEventCache,
  type InsertCalendarEventParams,
} from './calendar_events_cache_repository.js';

export interface ConnectGoogleCalendarParams {
  access_token: string;
  refresh_token: string | null;
  calendar_id: string;
  expires_at: string | null;
}

export interface ListCalendarEventsParams {
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Connects a Google Calendar for an instructor via OAuth.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param oauthPayload - OAuth token data
 * @returns Created/updated calendar connection
 */
export async function connectGoogleCalendar(
  userId: string,
  oauthPayload: ConnectGoogleCalendarParams
): Promise<InstructorCalendarConnection> {
  return upsertInstructorCalendarConnection({
    instructorId: userId,
    provider: 'google',
    access_token: oauthPayload.access_token,
    refresh_token: oauthPayload.refresh_token,
    calendar_id: oauthPayload.calendar_id,
    expires_at: oauthPayload.expires_at,
  });
}

/**
 * Disconnects the calendar for an instructor.
 * 
 * @param userId - User ID (must equal instructor ID)
 */
export async function disconnectCalendar(
  userId: string
): Promise<void> {
  // Delete connection
  await deleteInstructorCalendarConnection(userId);
  
  // Clear cached events
  await clearInstructorEvents(userId);
}

/**
 * Syncs calendar events (read-only).
 * Fetches events from external calendar and replaces cache.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param events - Array of events to cache
 */
export async function syncCalendarReadOnly(
  userId: string,
  events: InsertCalendarEventParams[]
): Promise<void> {
  // Clear existing cache
  await clearInstructorEvents(userId);
  
  // Insert new events
  await insertCalendarEvents(events);
}

/**
 * Lists cached calendar events for an instructor.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param filters - Optional date filters
 * @returns Array of cached calendar events
 */
export async function listCalendarEvents(
  userId: string,
  filters?: ListCalendarEventsParams
): Promise<CalendarEventCache[]> {
  return listInstructorEvents(
    userId,
    filters?.dateFrom,
    filters?.dateTo
  );
}
