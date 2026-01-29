import { FastifyInstance } from 'fastify';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';
import {
  resolveConversationByChannel,
  persistInboundMessageWithInboxBridge,
  orchestrateInboundDraft,
  isValidUUID,
} from '@frostdesk/db';
import { randomUUID } from 'crypto';

/**
 * WhatsApp Webhook Routes (Pilot, READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Exposes POST /webhook/whatsapp endpoint
 * - Parses and validates WhatsApp webhook payloads
 * - Returns acknowledgment
 * 
 * WHAT IT DOES NOT DO:
 * - No persistence (read-only validation)
 * - No processing
 */

export async function webhookWhatsAppRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook/whatsapp', async (request, reply) => {
    try {
      // Parse WhatsApp payload structure
      const body = request.body as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                id?: string;
                from?: string;
                timestamp?: string;
                type?: string;
                text?: {
                  body?: string;
                };
              }>;
            };
          }>;
        }>;
      };

      // Extract first message: entry[0].changes[0].value.messages[0]
      if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing entry array in payload',
          },
        });
      }

      const entry = body.entry[0];
      if (!entry.changes || !Array.isArray(entry.changes) || entry.changes.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing changes array in entry',
          },
        });
      }

      const change = entry.changes[0];
      if (!change.value || !change.value.messages || !Array.isArray(change.value.messages) || change.value.messages.length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing messages array in change value',
          },
        });
      }

      const message = change.value.messages[0];

      // Validate required fields
      if (!message.id) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.id',
          },
        });
      }

      if (!message.from) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.from',
          },
        });
      }

      if (!message.timestamp) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.timestamp',
          },
        });
      }

      // Support only text messages
      if (message.type !== 'text') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || `Unsupported message type: ${message.type}. Only 'text' is supported`,
          },
        });
      }

      if (!message.text || !message.text.body) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing message.text.body',
          },
        });
      }

      // Normalize WhatsApp message to canonical format
      const normalizedMessage = {
        external_id: message.id,
        channel: 'whatsapp' as const,
        sender_identifier: message.from,
        text: message.text.body,
        received_at: new Date(Number(message.timestamp) * 1000),
      };

      // Resolve conversation by channel and customer identifier
      console.log('[DEBUG STEP 1] Before resolveConversationByChannel - sender:', normalizedMessage.sender_identifier);
      const conversation = await resolveConversationByChannel(
        'whatsapp',
        normalizedMessage.sender_identifier,
        1 // Default instructor_id
      );
      console.log('[DEBUG STEP 2] After resolveConversationByChannel - conversation:', JSON.stringify(conversation, null, 2));
      console.log('[DEBUG STEP 2.1] conversation.id type:', typeof conversation?.id, 'value:', conversation?.id);

      // Ensure conversationId is always a valid UUID
      // Handle edge cases where conversation.id might be undefined/null
      const conversationId =
        conversation?.id ??
        randomUUID();
      console.log('[DEBUG STEP 3] After fallback - conversationId type:', typeof conversationId, 'value:', conversationId);

      // HARD DEBUG BLOCK: Intercept conversationId before DB insert
      // This catches runtime bugs where conversationId might be "1" or non-UUID
      if (typeof conversationId !== 'string') {
        console.error('[FATAL] conversationId is not string:', conversationId, typeof conversationId);
        throw new Error(`conversationId is not string: ${conversationId}`);
      }

      if (!conversationId.match(/^[0-9a-fA-F-]{36}$/)) {
        console.error('[FATAL] conversationId is not UUID:', conversationId);
        throw new Error(`conversationId is not UUID: ${conversationId}`);
      }

      console.log('[DEBUG] conversationId FINAL before DB insert:', conversationId);

      // PILOT MODE v1: message_type intentionally removed. Direction + channel are sufficient.
      // Persist message with inbox bridge (idempotent: checks external_id before insert)
      // This function inserts into both inbound_messages and messages tables atomically
      await persistInboundMessageWithInboxBridge({
        conversationId: conversationId,
        channel: normalizedMessage.channel,
        externalMessageId: normalizedMessage.external_id,
        senderIdentity: normalizedMessage.sender_identifier,
        messageText: normalizedMessage.text,
        // PILOT MODE v1: messageType removed (column not in schema)
        receivedAt: normalizedMessage.received_at,
        rawPayload: {
          ...message,
          // PILOT MODE v1: message_type removed from payload
          channel: normalizedMessage.channel,
        },
      });

      // F2.4.1: Orchestrate AI classification and draft generation (idempotent)
      try {
        await orchestrateInboundDraft({
          conversationId: conversationId,
          externalMessageId: normalizedMessage.external_id,
          messageText: normalizedMessage.text,
          channel: normalizedMessage.channel,
          language: 'it', // TODO: detect from message or payload
        });
      } catch (error) {
        // Orchestration failure should not break webhook response
        // Log error but return 200 OK (message was persisted)
        console.error('[WEBHOOK WHATSAPP] Draft orchestration failed:', error);
        // Continue to return success - message is persisted, snapshot/draft can be retried
      }

      // Payload processed and persisted
      return reply.status(200).send({
        ok: true,
      });
    } catch (error) {
      // Normalize any unexpected errors
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: {
          code: normalized.error,
          message: normalized.message || 'Failed to parse WhatsApp payload',
        },
      });
    }
  });
}
