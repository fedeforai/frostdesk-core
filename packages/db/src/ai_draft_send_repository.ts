import { sql } from './client.js';
import type { AIDraftMetadata } from './ai_draft_repository.js';

/** Transaction callback receives a callable client; postgres types expose it as TransactionSql. Cast for tagged template usage. */
function txAsSql(tx: unknown): typeof sql {
  return tx as unknown as typeof sql;
}

export class DraftNotFoundError extends Error {
  code = 'DRAFT_NOT_FOUND';
  
  constructor(conversationId: string) {
    super(`AI draft not found for conversation: ${conversationId}`);
    this.name = 'DraftNotFoundError';
  }
}

export async function sendApprovedAIDraft(params: {
  conversationId: string;
  approvedBy: string;
}): Promise<{
  message_id: string;
  text: string;
}> {
  const { conversationId, approvedBy } = params;

  return await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    const draftResult = await db<Array<{
      value: AIDraftMetadata;
    }>>`
      SELECT value
      FROM message_metadata
      WHERE conversation_id = ${conversationId}
        AND key = 'ai_draft'
      LIMIT 1
    `;

    if (draftResult.length === 0) {
      throw new DraftNotFoundError(conversationId);
    }

    const draft = draftResult[0].value;

    const conversationResult = await db<Array<{
      id: string;
      channel: string;
    }>>`
      SELECT id, channel
      FROM conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `;

    if (conversationResult.length === 0) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationResult[0];
    const channel = conversation.channel || 'whatsapp';

    const messageResult = await db<Array<{ id: string }>>`
      INSERT INTO messages (
        conversation_id,
        channel,
        direction,
        message_text,
        sender_identity,
        external_message_id,
        raw_payload,
        created_at
      )
      VALUES (
        ${conversationId},
        ${channel},
        'outbound',
        ${draft.text},
        'human',
        NULL,
        ${JSON.stringify({ draft_metadata: draft, approved_by: approvedBy })}::jsonb,
        NOW()
      )
      RETURNING id
    `;

    if (messageResult.length === 0) {
      throw new Error('Failed to create message');
    }

    const messageId = messageResult[0].id;

    // Increment quota usage
    const today = new Date();
    const period = today.toISOString().split('T')[0];
    const quotaUpdateResult = await db`
      UPDATE ai_channel_quotas
      SET used = used + 1
      WHERE channel = ${channel}
        AND period = ${period}::date
    `;

    if (quotaUpdateResult.count === 0) {
      throw new Error(`Quota row not found for channel ${channel} and period ${period}`);
    }

    const bookingResult = await db<Array<{
      id: string;
      instructor_id: number;
    }>>`
      SELECT id, instructor_id
      FROM bookings
      WHERE conversation_id = ${conversationId}
      LIMIT 1
    `;

    if (bookingResult.length > 0) {
      const booking = bookingResult[0];
      await db`
        INSERT INTO booking_audit_log (
          instructor_id,
          actor_user_id,
          action,
          booking_id,
          draft_payload
        ) VALUES (
          ${booking.instructor_id},
          ${approvedBy},
          'ai_draft_sent',
          ${booking.id},
          ${JSON.stringify({ draft_metadata: draft, approved_by: approvedBy })}::jsonb
        )
      `;
    }

    await db`
      DELETE FROM message_metadata
      WHERE conversation_id = ${conversationId}
        AND key = 'ai_draft'
    `;

    return {
      message_id: messageId,
      text: draft.text,
    };
  });
}
