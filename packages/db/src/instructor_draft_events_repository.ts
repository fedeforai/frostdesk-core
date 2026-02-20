import { sql } from './client.js';

export interface InsertInstructorDraftEventParams {
  conversationId: string;
  instructorId: string;
  eventType: string;
  source?: string;
  payload?: Record<string, unknown>;
}

/**
 * Inserts a draft lifecycle event (instructor_draft_events table).
 * Used for ai_draft_generated, ai_draft_used_exact, ai_draft_used_edited, ai_draft_ignored.
 */
export async function insertInstructorDraftEvent(
  params: InsertInstructorDraftEventParams
): Promise<void> {
  const source = params.source ?? 'api';
  const payload = params.payload ?? {};
  await sql`
    INSERT INTO instructor_draft_events (conversation_id, instructor_id, event_type, source, payload)
    VALUES (${params.conversationId}::uuid, ${params.instructorId}::uuid, ${params.eventType}, ${source}, ${JSON.stringify(payload)}::jsonb)
  `;
}

export type KpiWindow = '7d' | '30d' | '90d';

export interface InstructorDraftKpiSummary {
  generated: number;
  usedExact: number;
  usedEdited: number;
  used: number;
  ignored: number;
  expired: number;
  usageRate: number;
}

/**
 * Counts draft lifecycle events for an instructor in the given time window.
 * Used for GET /instructor/kpis/summary.
 */
export async function getInstructorDraftKpiSummary(
  instructorId: string,
  window: KpiWindow
): Promise<InstructorDraftKpiSummary> {
  const days = window === '7d' ? 7 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await sql<{ event_type: string; count: string }[]>`
    SELECT event_type, count(*)::text as count
    FROM instructor_draft_events
    WHERE instructor_id = ${instructorId}::uuid AND created_at >= ${since.toISOString()}
    GROUP BY event_type
  `;

  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.event_type] = parseInt(r.count, 10) || 0;
  }
  const generated = counts['ai_draft_generated'] ?? 0;
  const usedExact = counts['ai_draft_used_exact'] ?? 0;
  const usedEdited = counts['ai_draft_used_edited'] ?? 0;
  const used = usedExact + usedEdited;
  const ignored = counts['ai_draft_ignored'] ?? 0;
  const expired = 0; // spec: only count if event exists; we have no expired event type yet
  const usageRate = generated > 0 ? used / generated : 0;

  return {
    generated,
    usedExact,
    usedEdited,
    used,
    ignored,
    expired,
    usageRate,
  };
}
