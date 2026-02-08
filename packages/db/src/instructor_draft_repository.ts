import { sql } from './client.js';
import { insertInstructorDraftEvent } from './instructor_draft_events_repository.js';

/** Transaction callback: use same sql-like interface. */
function txAsSql(tx: unknown): typeof sql {
  return tx as unknown as typeof sql;
}

export type AiDraftState = 'proposed' | 'used' | 'ignored' | 'expired';

export interface AiDraftRow {
  id: string;
  conversation_id: string;
  instructor_id: string;
  state: AiDraftState;
  draft_text: string;
  created_at: string;
  used_at: string | null;
  ignored_at: string | null;
  expires_at: string | null;
  last_event_at: string;
}

/**
 * Effective state for API: proposed + past expires_at → expired.
 */
export function computeEffectiveState(draft: {
  state: AiDraftState;
  expires_at: string | null;
}): AiDraftState {
  if (draft.state === 'proposed' && draft.expires_at) {
    if (new Date(draft.expires_at) < new Date()) return 'expired';
  }
  return draft.state;
}

export async function upsertProposedDraft(params: {
  conversationId: string;
  instructorId: string;
  draftText: string;
  expiresAt: Date | null;
}): Promise<AiDraftRow> {
  const { conversationId, instructorId, draftText, expiresAt } = params;
  const expiresAtVal = expiresAt ? expiresAt.toISOString() : null;

  return await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    const existing = await db<AiDraftRow[]>`
      SELECT id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
      FROM ai_drafts
      WHERE conversation_id = ${conversationId}::uuid AND instructor_id = ${instructorId}::uuid AND state = 'proposed'
      FOR UPDATE
    `;
    let row: AiDraftRow;
    if (existing.length > 0) {
      const updated = await db<AiDraftRow[]>`
        UPDATE ai_drafts
        SET draft_text = ${draftText}, expires_at = ${expiresAtVal}::timestamptz, last_event_at = now()
        WHERE id = ${existing[0].id}::uuid
        RETURNING id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
      `;
      if (updated.length === 0) throw new Error('Update ai_drafts failed');
      row = updated[0];
    } else {
      const inserted = await db<AiDraftRow[]>`
        INSERT INTO ai_drafts (conversation_id, instructor_id, state, draft_text, expires_at)
        VALUES (${conversationId}::uuid, ${instructorId}::uuid, 'proposed', ${draftText}, ${expiresAtVal}::timestamptz)
        RETURNING id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
      `;
      if (inserted.length === 0) throw new Error('Insert ai_drafts failed');
      row = inserted[0];
    }
    await insertInstructorDraftEvent({
      conversationId,
      instructorId,
      eventType: 'ai_draft_generated',
      payload: { draftId: row.id },
    });
    return row;
  });
}

export async function getDraftById(draftId: string): Promise<AiDraftRow | null> {
  const rows = await sql<AiDraftRow[]>`
    SELECT id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
    FROM ai_drafts
    WHERE id = ${draftId}::uuid
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function getActiveDraftForConversation(params: {
  conversationId: string;
  instructorId: string;
}): Promise<AiDraftRow | null> {
  const rows = await sql<AiDraftRow[]>`
    SELECT id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
    FROM ai_drafts
    WHERE conversation_id = ${params.conversationId}::uuid AND instructor_id = ${params.instructorId}::uuid
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function markDraftUsed(params: {
  draftId: string;
  instructorId: string;
  mode: 'exact' | 'edited';
}): Promise<void> {
  const eventType = params.mode === 'exact' ? 'ai_draft_used_exact' : 'ai_draft_used_edited';
  await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    const updated = await db<AiDraftRow[]>`
      UPDATE ai_drafts
      SET state = 'used', used_at = now(), last_event_at = now()
      WHERE id = ${params.draftId}::uuid AND instructor_id = ${params.instructorId}::uuid
      RETURNING id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
    `;
    if (updated.length === 0) throw new DraftNotFoundError(params.draftId);
    const row = updated[0];
    await insertInstructorDraftEvent({
      conversationId: row.conversation_id,
      instructorId: row.instructor_id,
      eventType,
      payload: { draftId: row.id },
    });
  });
}

export async function markDraftIgnored(params: {
  draftId: string;
  instructorId: string;
}): Promise<void> {
  await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    const updated = await db<AiDraftRow[]>`
      UPDATE ai_drafts
      SET state = 'ignored', ignored_at = now(), last_event_at = now()
      WHERE id = ${params.draftId}::uuid AND instructor_id = ${params.instructorId}::uuid
      RETURNING id, conversation_id, instructor_id, state, draft_text, created_at, used_at, ignored_at, expires_at, last_event_at
    `;
    if (updated.length === 0) throw new DraftNotFoundError(params.draftId);
    const row = updated[0];
    await insertInstructorDraftEvent({
      conversationId: row.conversation_id,
      instructorId: row.instructor_id,
      eventType: 'ai_draft_ignored',
      payload: { draftId: row.id },
    });
  });
}

export class DraftNotFoundError extends Error {
  code = 'DRAFT_NOT_FOUND' as const;
  constructor(draftId: string) {
    super(`Draft not found: ${draftId}`);
    this.name = 'DraftNotFoundError';
  }
}
