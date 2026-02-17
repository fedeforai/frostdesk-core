import { sql } from './client.js';

export type CalendarConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected';

export interface CalendarConnection {
  id: string;
  instructor_id: string;
  provider: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Gets the calendar connection for an instructor and provider (e.g. google).
 */
export async function getCalendarConnection(
  instructorId: string,
  provider: string
): Promise<CalendarConnection | null> {
  const result = await sql<CalendarConnection[]>`
    SELECT id, instructor_id, provider,
           access_token_encrypted, refresh_token_encrypted, token_expires_at,
           status, last_sync_at, last_sync_error, created_at, updated_at
    FROM calendar_connections
    WHERE instructor_id = ${instructorId} AND provider = ${provider}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Creates or updates a calendar connection (stub: stores record without real tokens).
 */
export async function upsertCalendarConnection(params: {
  instructor_id: string;
  provider: string;
  status: string;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: string | null;
}): Promise<CalendarConnection> {
  const existing = await getCalendarConnection(params.instructor_id, params.provider);
  if (existing) {
    const result = await sql<CalendarConnection[]>`
      UPDATE calendar_connections
      SET status = ${params.status},
          access_token_encrypted = COALESCE(${params.access_token_encrypted ?? null}, access_token_encrypted),
          refresh_token_encrypted = COALESCE(${params.refresh_token_encrypted ?? null}, refresh_token_encrypted),
          token_expires_at = COALESCE(${params.token_expires_at ?? null}, token_expires_at),
          updated_at = NOW()
      WHERE id = ${existing.id}
      RETURNING id, instructor_id, provider,
                access_token_encrypted, refresh_token_encrypted, token_expires_at,
                status, last_sync_at, last_sync_error, created_at, updated_at
    `;
    return result[0];
  }
  const result = await sql<CalendarConnection[]>`
    INSERT INTO calendar_connections (instructor_id, provider, status, access_token_encrypted, refresh_token_encrypted, token_expires_at)
    VALUES (${params.instructor_id}, ${params.provider}, ${params.status},
            ${params.access_token_encrypted ?? null}, ${params.refresh_token_encrypted ?? null}, ${params.token_expires_at ?? null})
    RETURNING id, instructor_id, provider,
              access_token_encrypted, refresh_token_encrypted, token_expires_at,
              status, last_sync_at, last_sync_error, created_at, updated_at
  `;
  return result[0];
}

/**
 * Updates last_sync_at and optional last_sync_error for a connection.
 */
export async function updateCalendarConnectionSync(
  connectionId: string,
  lastSyncError: string | null
): Promise<void> {
  await sql`
    UPDATE calendar_connections
    SET last_sync_at = NOW(), last_sync_error = ${lastSyncError}, updated_at = NOW()
    WHERE id = ${connectionId}
  `;
}
