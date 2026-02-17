/**
 * Loop 6: Decision timeline for a conversation (READ-ONLY).
 * Aggregates: conversation_handoffs, audit_log (conversation), booking_audit, messages.
 * No inferred events; every event maps to a persisted record.
 */

import { sql } from './client.js';

export type DecisionTimelineEventType =
  | 'booking_state_change'
  | 'ai_state_change'
  | 'handoff'
  | 'message'
  | 'system';

export type DecisionTimelineActorType = 'human' | 'ai' | 'system';

export interface ConversationDecisionTimelineEvent {
  timestamp: string;
  type: DecisionTimelineEventType;
  actor_type: DecisionTimelineActorType;
  actor_id: string | null;
  summary: string;
  payload: Record<string, unknown>;
}

/**
 * Builds chronological decision timeline for a conversation.
 * Read-only; uses only existing tables. No inference.
 */
export async function getConversationDecisionTimeline(
  conversationId: string
): Promise<ConversationDecisionTimelineEvent[]> {
  const events: ConversationDecisionTimelineEvent[] = [];

  // 1. Handoffs (conversation_handoffs)
  const handoffs = await sql<{
    created_at: string;
    from_instructor_id: string;
    to_instructor_id: string;
    reason: string | null;
    created_by: string | null;
  }[]>`
    SELECT created_at, from_instructor_id, to_instructor_id, reason, created_by
    FROM conversation_handoffs
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;
  for (const h of handoffs) {
    events.push({
      timestamp: h.created_at,
      type: 'handoff',
      actor_type: 'human',
      actor_id: h.created_by,
      summary: `Conversation handed off to another instructor`,
      payload: {
        from_instructor_id: h.from_instructor_id,
        to_instructor_id: h.to_instructor_id,
        reason: h.reason ?? null,
      },
    });
  }

  // 2. Audit log (conversation-scoped): ai_state_change and other actions
  const auditRows = await sql<{
    created_at: string;
    actor_type: string;
    actor_id: string | null;
    action: string;
    payload: Record<string, unknown> | null;
  }[]>`
    SELECT created_at, actor_type, actor_id, action, payload
    FROM audit_log
    WHERE entity_type = 'conversation' AND entity_id = ${conversationId}
    ORDER BY created_at ASC
  `;
  for (const row of auditRows) {
    const actorType: DecisionTimelineActorType =
      row.actor_type === 'instructor' || row.actor_type === 'admin'
        ? 'human'
        : row.actor_type === 'system'
          ? 'system'
          : 'human';
    const isAiState = row.action === 'ai_state_change';
    events.push({
      timestamp: row.created_at,
      type: isAiState ? 'ai_state_change' : 'system',
      actor_type: actorType,
      actor_id: row.actor_id,
      summary: isAiState ? 'AI state changed' : row.action,
      payload: row.payload ?? {},
    });
  }

  // 3. Booking state changes (booking_audit for this conversation's bookings)
  const bookingAudit = await sql<{
    booking_id: string;
    previous_state: string | null;
    new_state: string | null;
    actor: string;
    created_at: string;
  }[]>`
    SELECT ba.booking_id, ba.previous_state, ba.new_state, ba.actor, ba.created_at
    FROM booking_audit ba
    INNER JOIN bookings b ON b.id = ba.booking_id
    WHERE b.conversation_id = ${conversationId}
    ORDER BY ba.created_at ASC
  `;
  for (const a of bookingAudit) {
    events.push({
      timestamp: a.created_at,
      type: 'booking_state_change',
      actor_type: a.actor === 'human' ? 'human' : 'system',
      actor_id: null,
      summary: `Booking state: ${a.previous_state ?? '?'} → ${a.new_state ?? '?'}`,
      payload: {
        booking_id: a.booking_id,
        from: a.previous_state,
        to: a.new_state,
      },
    });
  }

  // 4. Messages (inbound + outbound with sender_identity) as message events
  const messages = await sql<{
    id: string;
    created_at: string;
    direction: string;
    sender_identity: string | null;
  }[]>`
    SELECT id, created_at, direction, sender_identity
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;
  for (const m of messages) {
    const isInbound = m.direction === 'inbound';
    events.push({
      timestamp: m.created_at,
      type: 'message',
      actor_type: isInbound ? 'human' : (m.sender_identity === 'human' ? 'human' : 'system'),
      actor_id: null,
      summary: isInbound ? 'Customer message received' : 'Message sent',
      payload: { message_id: m.id, direction: m.direction },
    });
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
