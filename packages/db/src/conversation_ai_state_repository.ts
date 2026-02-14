/**
 * Loop 3: AI conversation state — explicit, auditable.
 * Source: docs/diagrams/AI_STATE_MACHINE.mmd
 * States: ai_on | ai_paused_by_human | ai_suggestion_only
 * Every state change writes to audit_log (actor_type, previous_state, next_state, reason).
 */

import { sql } from './client.js';
import { insertAuditEvent } from './audit_log_repository.js';

export type ConversationAiState = 'ai_on' | 'ai_paused_by_human' | 'ai_suggestion_only';

export type AiStateActorType = 'human' | 'system' | 'admin';

/**
 * Returns the current ai_state for a conversation.
 * Default (new or missing column) is ai_on per migration.
 */
export async function getConversationAiState(
  conversationId: string
): Promise<ConversationAiState> {
  const result = await sql<Array<{ ai_state: string }>>`
    SELECT COALESCE(ai_state, 'ai_on') AS ai_state
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return 'ai_on';
  }

  const raw = result[0].ai_state;
  if (
    raw === 'ai_on' ||
    raw === 'ai_paused_by_human' ||
    raw === 'ai_suggestion_only'
  ) {
    return raw as ConversationAiState;
  }
  return 'ai_on';
}

export interface SetConversationAiStateParams {
  conversationId: string;
  nextState: ConversationAiState;
  actorType: AiStateActorType;
  /** Optional reason for audit (e.g. 'manual_pause_in_ui', 'outbound_sent_via_frostdesk') */
  reason?: string | null;
  /** Optional actor id (e.g. user id) for audit */
  actorId?: string | null;
}

/**
 * Sets conversation ai_state and writes an audit log entry.
 * Does not validate transitions; caller must enforce diagram rules.
 */
export async function setConversationAiState(
  params: SetConversationAiStateParams
): Promise<void> {
  const { conversationId, nextState, actorType, reason, actorId } = params;

  const previous = await getConversationAiState(conversationId);

  await sql`
    UPDATE conversations
    SET ai_state = ${nextState}, updated_at = NOW()
    WHERE id = ${conversationId}
  `;

  const auditActorType =
    actorType === 'admin' ? 'admin' : actorType === 'human' ? 'instructor' : 'system';
  await insertAuditEvent({
    actor_type: auditActorType,
    actor_id: actorId ?? null,
    action: 'ai_state_change',
    entity_type: 'conversation',
    entity_id: conversationId,
    severity: 'info',
    payload: {
      previous_state: previous,
      next_state: nextState,
      actor_type: actorType,
      reason: reason ?? null,
    },
  });
}

/** Can AI suggest (generate drafts)? ai_on and ai_suggestion_only only; ai_paused_by_human blocks. */
export function canAISuggest(aiState: ConversationAiState): boolean {
  return aiState === 'ai_on' || aiState === 'ai_suggestion_only';
}

/** Can human approve-and-send an AI draft? ai_on only; ai_suggestion_only blocks send. */
export function canSendAIDraft(aiState: ConversationAiState): boolean {
  return aiState === 'ai_on';
}
