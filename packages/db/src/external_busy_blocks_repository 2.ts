import { sql } from './client.js';

export interface ExternalBusyBlock {
  id: string;
  instructor_id: string;
  connection_id: string;
  external_id: string;
  provider: string;
  start_utc: string;
  end_utc: string;
  status: string;
  created_at: string;
}

/**
 * Lists external busy blocks overlapping [startUtc, endUtc] for an instructor.
 */
export async function listExternalBusyBlocksInRange(
  instructorId: string,
  startUtc: string,
  endUtc: string
): Promise<ExternalBusyBlock[]> {
  const result = await sql<ExternalBusyBlock[]>`
    SELECT id, instructor_id, connection_id, external_id, provider, start_utc, end_utc, status, created_at
    FROM external_busy_blocks
    WHERE instructor_id = ${instructorId}
      AND start_utc::timestamptz < ${endUtc}::timestamptz
      AND end_utc::timestamptz > ${startUtc}::timestamptz
    ORDER BY start_utc ASC
  `;
  return result;
}

/**
 * Upserts a busy block by connection_id + external_id. No sensitive event details stored.
 */
export async function upsertExternalBusyBlock(params: {
  instructor_id: string;
  connection_id: string;
  external_id: string;
  provider: string;
  start_utc: string;
  end_utc: string;
  status?: string;
}): Promise<ExternalBusyBlock> {
  const status = params.status ?? 'busy';
  const result = await sql<ExternalBusyBlock[]>`
    INSERT INTO external_busy_blocks (instructor_id, connection_id, external_id, provider, start_utc, end_utc, status)
    VALUES (${params.instructor_id}, ${params.connection_id}, ${params.external_id}, ${params.provider},
            ${params.start_utc}::timestamptz, ${params.end_utc}::timestamptz, ${status})
    ON CONFLICT (connection_id, external_id)
    DO UPDATE SET start_utc = EXCLUDED.start_utc, end_utc = EXCLUDED.end_utc, status = EXCLUDED.status
    RETURNING id, instructor_id, connection_id, external_id, provider, start_utc, end_utc, status, created_at
  `;
  return result[0];
}

/**
 * Deletes all busy blocks for a connection (e.g. before a full sync).
 */
export async function deleteExternalBusyBlocksByConnection(connectionId: string): Promise<void> {
  await sql`DELETE FROM external_busy_blocks WHERE connection_id = ${connectionId}`;
}
