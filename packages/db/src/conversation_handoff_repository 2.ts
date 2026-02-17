/**
 * Loop 5: Manual conversation handoff. Event log + ownership update.
 * Append-only handoffs. Single source of truth: conversations.instructor_id.
 */

import { sql } from './client.js';
import { insertAuditEvent } from './audit_log_repository.js';
import {
  getConversationById,
  ConversationNotFoundError,
} from './conversation_repository.js';

export class HandoffNotOwnerError extends Error {
  code = 'HANDOFF_NOT_OWNER';
  constructor(conversationId: string) {
    super(`Not the owner of conversation: ${conversationId}`);
    this.name = 'HandoffNotOwnerError';
  }
}

export class HandoffConflictError extends Error {
  code = 'HANDOFF_CONFLICT';
  constructor(conversationId: string) {
    super(`Conversation already reassigned: ${conversationId}`);
    this.name = 'HandoffConflictError';
  }
}

export interface RecordHandoffParams {
  conversationId: string;
  fromInstructorId: string;
  toInstructorId: string;
  reason: string | null;
  createdBy: string;
}

export interface RecordHandoffResult {
  conversation_id: string;
  from_instructor_id: string;
  to_instructor_id: string;
  handoff_at: string;
}

/**
 * Executes handoff: updates conversation owner, appends handoff event, writes audit.
 * Atomic: if conversation owner changed concurrently, throws HandoffConflictError.
 */
export async function recordHandoff(params: RecordHandoffParams): Promise<RecordHandoffResult> {
  const { conversationId, fromInstructorId, toInstructorId, reason, createdBy } = params;

  const conv = await getConversationById(conversationId);
  if (!conv) {
    throw new ConversationNotFoundError(conversationId);
  }

  const currentOwner = String(conv.instructor_id);
  if (currentOwner !== fromInstructorId) {
    throw new HandoffNotOwnerError(conversationId);
  }

  const updated = await sql<Array<{ id: string; instructor_id: string; updated_at: string }>>`
    UPDATE conversations
    SET instructor_id = ${toInstructorId}::uuid, updated_at = NOW()
    WHERE id = ${conversationId}
      AND instructor_id = ${fromInstructorId}::uuid
    RETURNING id, instructor_id, updated_at
  `;

  if (updated.length === 0) {
    throw new HandoffConflictError(conversationId);
  }

  const handoffAt = new Date().toISOString();

  await sql`
    INSERT INTO conversation_handoffs (
      conversation_id,
      from_instructor_id,
      to_instructor_id,
      reason,
      created_by
    )
    VALUES (
      ${conversationId},
      ${fromInstructorId},
      ${toInstructorId},
      ${reason},
      ${createdBy}
    )
  `;

  await insertAuditEvent({
    actor_type: 'instructor',
    actor_id: createdBy,
    action: 'conversation_handoff',
    entity_type: 'conversation',
    entity_id: conversationId,
    severity: 'info',
    payload: {
      from_instructor_id: fromInstructorId,
      to_instructor_id: toInstructorId,
      reason: reason ?? null,
    },
  });

  return {
    conversation_id: conversationId,
    from_instructor_id: fromInstructorId,
    to_instructor_id: toInstructorId,
    handoff_at: handoffAt,
  };
}
