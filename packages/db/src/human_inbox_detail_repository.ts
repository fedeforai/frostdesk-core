import { sql } from './client.js';

export async function getHumanInboxDetail(
  conversationId: string
): Promise<{
  conversation_id: string;
  channel: string;
  status: string;
  created_at: string;
  booking: {
    booking_id: string;
    status: string;
    instructor_id: string;
    created_at: string;
  } | null;
  messages: Array<{
    message_id: string;
    direction: 'inbound' | 'outbound';
    message_text: string | null;
    sender_identity: string | null;
    created_at: string;
    intent: string | null;
    confidence: number | null;
    model: string | null;
  }>;
} | null> {
  // PILOT MODE: ai_enabled column not part of schema, removed from SELECT
  const conversationResult = await sql<Array<{
    id: string;
    channel: string;
    status: string;
    created_at: string;
  }>>`
    SELECT 
      id,
      channel,
      status,
      created_at
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;

  if (conversationResult.length === 0) {
    return null;
  }

  const conversation = conversationResult[0];

  const bookingResult = await sql<Array<{
    id: string;
    status: string;
    instructor_id: number;
    created_at: string;
  }>>`
    SELECT 
      id,
      status,
      instructor_id,
      created_at
    FROM bookings
    WHERE conversation_id = ${conversationId}
    LIMIT 1
  `;

  const messagesResult = await sql<Array<{
    message_id: string;
    direction: string;
    message_text: string | null;
    sender_identity: string | null;
    created_at: string;
    intent: string | null;
    confidence: number | null;
    model: string | null;
  }>>`
    SELECT 
      m.id AS message_id,
      m.direction,
      m.message_text,
      m.sender_identity,
      m.created_at,
      (mm.value->>'intent')::text AS intent,
      (mm.value->>'confidence')::numeric AS confidence,
      (mm.value->>'model')::text AS model
    FROM messages m
    LEFT JOIN message_metadata mm ON mm.message_id = m.id AND mm.key = 'intent_classification'
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;

  return {
    conversation_id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    created_at: conversation.created_at,
    booking: bookingResult.length > 0 ? {
      booking_id: bookingResult[0].id,
      status: bookingResult[0].status,
      instructor_id: String(bookingResult[0].instructor_id),
      created_at: bookingResult[0].created_at,
    } : null,
    messages: messagesResult.map((row) => ({
      message_id: row.message_id,
      direction: row.direction as 'inbound' | 'outbound',
      message_text: row.message_text,
      sender_identity: row.sender_identity,
      created_at: row.created_at,
      intent: row.intent,
      confidence: row.confidence,
      model: row.model,
    })),
  };
}
