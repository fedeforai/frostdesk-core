import { sql } from './client.js';

export interface InstructorFeedbackRow {
  id: string;
  instructor_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  admin_notes: string | null;
}

const BODY_MAX_LENGTH = 2000;

/**
 * Insert a feedback message from an instructor. Body is trimmed and limited to BODY_MAX_LENGTH.
 */
export async function insertInstructorFeedback(
  instructorId: string,
  body: string,
): Promise<{ id: string; created_at: string }> {
  const trimmed = typeof body === 'string' ? body.trim() : '';
  if (!trimmed) {
    throw new Error('Feedback body is required');
  }
  const truncated = trimmed.length > BODY_MAX_LENGTH ? trimmed.slice(0, BODY_MAX_LENGTH) : trimmed;
  const result = await sql<InstructorFeedbackRow[]>`
    INSERT INTO instructor_feedback (instructor_id, body)
    VALUES (${instructorId}, ${truncated})
    RETURNING id, created_at
  `;
  if (result.length === 0) throw new Error('Insert instructor feedback failed');
  const row = result[0];
  return { id: row.id, created_at: row.created_at };
}

/**
 * List all feedback for an instructor, newest first. Use for instructor (own list, exclude admin_notes in API)
 * or admin (full row with read_at, admin_notes).
 */
export async function listInstructorFeedbackByInstructorId(
  instructorId: string,
): Promise<InstructorFeedbackRow[]> {
  const rows = await sql<InstructorFeedbackRow[]>`
    SELECT id, instructor_id, body, created_at, read_at, admin_notes
    FROM instructor_feedback
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
  `;
  return rows;
}

/**
 * Update read_at and/or admin_notes for a feedback row. Returns true if a row was updated.
 */
export async function updateInstructorFeedback(
  id: string,
  patch: { read_at?: string | null; admin_notes?: string | null },
): Promise<boolean> {
  if (patch.read_at !== undefined && patch.admin_notes !== undefined) {
    const r = await sql<InstructorFeedbackRow[]>`
      UPDATE instructor_feedback
      SET read_at = ${patch.read_at}, admin_notes = ${patch.admin_notes}
      WHERE id = ${id}
      RETURNING id
    `;
    return r.length > 0;
  }
  if (patch.read_at !== undefined) {
    const r = await sql<InstructorFeedbackRow[]>`
      UPDATE instructor_feedback
      SET read_at = ${patch.read_at}
      WHERE id = ${id}
      RETURNING id
    `;
    return r.length > 0;
  }
  if (patch.admin_notes !== undefined) {
    const r = await sql<InstructorFeedbackRow[]>`
      UPDATE instructor_feedback
      SET admin_notes = ${patch.admin_notes}
      WHERE id = ${id}
      RETURNING id
    `;
    return r.length > 0;
  }
  return true;
}
