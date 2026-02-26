/**
 * Google Calendar: fetch busy windows via freebusy API. Token refresh when expired.
 * Do not log tokens or sensitive event details.
 */

import type { CalendarConnection } from '@frostdesk/db';
import { upsertCalendarConnection } from '@frostdesk/db';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';

const DEFAULT_CALENDAR_IDS = ['primary'];

/** Buffer before expiry to refresh (seconds). */
const REFRESH_BUFFER_SEC = 5 * 60;

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return { clientId, clientSecret };
}

export interface GoogleBusyEvent {
  external_id: string;
  start_utc: string;
  end_utc: string;
}

/**
 * Refreshes access token using refresh_token and updates the connection in DB.
 * Returns new access_token. Throws on failure.
 */
async function refreshAndPersist(connection: CalendarConnection): Promise<string> {
  const { clientId, clientSecret } = getConfig();
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required for refresh');
  const refreshToken = connection.refresh_token_encrypted?.trim();
  if (!refreshToken) throw new Error('No refresh token for calendar connection');
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${text.slice(0, 150)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = data.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await upsertCalendarConnection({
    instructor_id: connection.instructor_id,
    provider: connection.provider,
    status: connection.status,
    access_token_encrypted: data.access_token,
    refresh_token_encrypted: connection.refresh_token_encrypted,
    token_expires_at: expiresAt,
  });
  return data.access_token;
}

/**
 * Returns a valid access token, refreshing if expired.
 */
async function getValidAccessToken(connection: CalendarConnection): Promise<string> {
  const access = connection.access_token_encrypted?.trim();
  if (!access) throw new Error('No access token for calendar connection');
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const now = Date.now();
  if (expiresAt - REFRESH_BUFFER_SEC * 1000 > now) return access;
  return refreshAndPersist(connection);
}

/**
 * Fetches busy windows from Google Calendar for the given connection.
 * Uses freebusy API; calendar_ids default to ['primary'] if not stored.
 */
export async function fetchGoogleBusyEvents(
  connection: CalendarConnection,
  startUtc: string,
  endUtc: string
): Promise<GoogleBusyEvent[]> {
  const accessToken = await getValidAccessToken(connection);
  const calendarIds = DEFAULT_CALENDAR_IDS;
  const body = JSON.stringify({
    timeMin: startUtc,
    timeMax: endUtc,
    items: calendarIds.map((id) => ({ id })),
  });
  const res = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google freebusy failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    calendars?: Record<
      string,
      { busy?: Array<{ start: string; end: string }> }
    >;
  };
  const out: GoogleBusyEvent[] = [];
  for (const [calId, cal] of Object.entries(data.calendars ?? {})) {
    for (const busy of cal.busy ?? []) {
      out.push({
        external_id: `${calId}-${busy.start}-${busy.end}`,
        start_utc: busy.start,
        end_utc: busy.end,
      });
    }
  }
  return out;
}
