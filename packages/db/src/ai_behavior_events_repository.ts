import { sql } from './client.js';

/**
 * Inserts one row into ai_behavior_events. Append-only tracking.
 */
export async function insertAiBehaviorEvent(
  instructorId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO public.ai_behavior_events (instructor_id, action, metadata)
    VALUES (${instructorId}::uuid, ${action}, ${JSON.stringify(metadata)}::jsonb)
  `;
}
