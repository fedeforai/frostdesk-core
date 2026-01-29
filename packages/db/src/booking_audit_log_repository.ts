import { sql } from './client.js';

export async function listInstructorBookingAuditLogs(instructorId: string) {
  const result = await sql`
    SELECT *
    FROM booking_audit_log
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return result;
}
