/**
 * Google Calendar busy-event fetch. Stub: returns no events.
 * Replace with real Google Calendar API (freebusy or events list) when OAuth is in place.
 * Do not log tokens or sensitive event details.
 */

import type { CalendarConnection } from '@frostdesk/db';

export interface GoogleBusyEvent {
  external_id: string;
  start_utc: string;
  end_utc: string;
}

/**
 * Fetches busy windows from Google Calendar for the given connection.
 * Stub implementation: returns empty array. Real implementation will use
 * access_token_encrypted (decrypted) to call calendar.freebusy.query or events.list.
 */
export async function fetchGoogleBusyEvents(
  _connection: CalendarConnection,
  _startUtc: string,
  _endUtc: string
): Promise<GoogleBusyEvent[]> {
  return [];
}
