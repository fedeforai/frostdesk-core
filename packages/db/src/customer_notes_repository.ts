import { sql } from './client.js';

export type CustomerNoteRow = {
  id: string;
  customer_id: string;
  instructor_id: string;
  content: string;
  created_at: string;
};

/**
 * List notes for a customer, newest first. Caller must enforce customer belongs to instructor.
 * @param limit - Max notes to return (default no limit). Use 50 for detail page.
 */
export async function listNotesByCustomerId(
  customerId: string,
  limit?: number
): Promise<CustomerNoteRow[]> {
  const result = limit != null
    ? await sql<CustomerNoteRow[]>`
        SELECT id, customer_id, instructor_id, content, created_at
        FROM customer_notes
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql<CustomerNoteRow[]>`
        SELECT id, customer_id, instructor_id, content, created_at
        FROM customer_notes
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
      `;
  return result;
}

/**
 * Create a note. Caller must ensure customer exists and belongs to instructorId.
 */
export async function createCustomerNote(params: {
  customerId: string;
  instructorId: string;
  content: string;
}): Promise<CustomerNoteRow> {
  const trimmed = params.content?.trim();
  if (!trimmed) {
    const e = new Error('Note content is required');
    (e as any).code = 'MISSING_PARAMETERS';
    throw e;
  }

  const result = await sql<CustomerNoteRow[]>`
    INSERT INTO customer_notes (customer_id, instructor_id, content)
    VALUES (${params.customerId}, ${params.instructorId}, ${trimmed})
    RETURNING id, customer_id, instructor_id, content, created_at
  `;
  if (result.length === 0) throw new Error('Failed to create note');
  return result[0];
}
