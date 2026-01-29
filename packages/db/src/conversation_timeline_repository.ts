import { sql } from './client.js';

/**
 * Conversation Timeline Repository (READ-ONLY)
 * 
 * READ-ONLY timeline reconstruction for a conversation.
 * 
 * This repository:
 * - Reads existing tables only
 * - Does NOT infer or decide anything
 * - Produces a linear, semantic timeline
 */

export type TimelineActor = 'customer' | 'ai' | 'human' | 'system';

export type TimelineEventType =
  | 'message_received'
  | 'ai_draft_created'
  | 'human_approved'
  | 'booking_created'
  | 'booking_state_changed';

export interface TimelineEvent {
  type: TimelineEventType;
  label: string;
  actor: TimelineActor;
  timestamp: string;
  href?: string;
}

/**
 * Builds semantic timeline for a conversation (READ-ONLY).
 */
export async function getConversationTimeline(
  conversationId: string
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  /**
   * 1. Customer inbound messages
   */
  const inboundMessages = await sql<{
    id: string;
    created_at: string;
  }[]>`
    SELECT id, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
      AND direction = 'inbound'
    ORDER BY created_at ASC
  `;

  for (const msg of inboundMessages) {
    events.push({
      type: 'message_received',
      label: 'Customer message received',
      actor: 'customer',
      timestamp: msg.created_at,
    });
  }

  /**
   * 2. AI draft generated
   */
  const aiDrafts = await sql<{
    value: {
      created_at: string;
    };
  }[]>`
    SELECT value
    FROM message_metadata
    WHERE conversation_id = ${conversationId}
      AND key = 'ai_draft'
    ORDER BY (value->>'created_at') ASC
  `;

  for (const draft of aiDrafts) {
    const draftData = draft.value as { created_at: string };
    events.push({
      type: 'ai_draft_created',
      label: 'AI draft generated',
      actor: 'ai',
      timestamp: draftData.created_at,
    });
  }

  /**
   * 3. Human approved / sent reply
   */
  const humanMessages = await sql<{
    id: string;
    created_at: string;
  }[]>`
    SELECT id, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
      AND sender_identity = 'human'
      AND direction = 'outbound'
    ORDER BY created_at ASC
  `;

  for (const msg of humanMessages) {
    events.push({
      type: 'human_approved',
      label: 'Human approved and sent reply',
      actor: 'human',
      timestamp: msg.created_at,
    });
  }

  /**
   * 4. Booking created from conversation
   */
  const bookings = await sql<{
    id: string;
    created_at: string;
  }[]>`
    SELECT id, created_at
    FROM bookings
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;

  for (const booking of bookings) {
    events.push({
      type: 'booking_created',
      label: 'Booking created',
      actor: 'system',
      timestamp: booking.created_at,
      href: `/admin/bookings/${booking.id}`,
    });
  }

  /**
   * 5. Booking state changes (audit)
   */
  const bookingAudit = await sql<{
    booking_id: string;
    previous_state: string | null;
    new_state: string | null;
    actor: string;
    created_at: string;
  }[]>`
    SELECT booking_id, previous_state, new_state, actor, created_at
    FROM booking_audit
    WHERE booking_id IN (
      SELECT id FROM bookings WHERE conversation_id = ${conversationId}
    )
    ORDER BY created_at ASC
  `;

  for (const audit of bookingAudit) {
    events.push({
      type: 'booking_state_changed',
      label: `Booking state changed: ${audit.previous_state ?? 'unknown'} → ${audit.new_state ?? 'unknown'}`,
      actor: audit.actor === 'human' ? 'human' : 'system',
      timestamp: audit.created_at,
      href: `/admin/bookings/${audit.booking_id}`,
    });
  }

  /**
   * Final ordering safeguard
   */
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
