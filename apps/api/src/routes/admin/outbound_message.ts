import { FastifyInstance } from 'fastify';
import { persistOutboundMessage, isValidUUID, enqueueOutboundSend, OutboundQueueFullError } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { resolveWhatsAppTargetPhone, TARGET_NOT_FOUND } from '../../integrations/whatsapp_target_resolution.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/** Safe message for API response: no full body, max length. */
function safeErrorMessage(err: Error): string {
  const msg = err?.message ?? 'Unknown error';
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

/**
 * Admin Outbound Message Routes (Manual Send Only)
 *
 * WHAT IT DOES:
 * - Exposes POST /admin/messages/outbound endpoint
 * - Enforces admin access
 * - Persists outbound message to messages table
 * - Enqueues send job for WhatsApp (worker delivers via Meta API)
 *
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No booking creation
 * - No synchronous send (delivery is async via worker)
 */

export async function adminOutboundMessageRoutes(app: FastifyInstance) {
  app.post('/admin/messages/outbound', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const body = request.body as {
        conversation_id?: string;
        text?: string;
      };

      // Validate conversation_id: must be present and valid UUID
      if (!body.conversation_id || typeof body.conversation_id !== 'string') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing or invalid conversation_id',
          },
        });
      }

      if (!isValidUUID(body.conversation_id)) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Invalid conversation_id format (must be UUID)',
          },
        });
      }

      // Validate text: must be present and non-empty
      if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing or empty text',
          },
        });
      }

      // Persist outbound message (source of truth)
      const result = await persistOutboundMessage({
        conversationId: body.conversation_id,
        channel: 'whatsapp',
        senderIdentity: 'human',
        messageText: body.text.trim(),
      });

      const to = await resolveWhatsAppTargetPhone(body.conversation_id);
      const enqueueResult = await enqueueOutboundSend({
        messageId: result.id,
        conversationId: body.conversation_id,
        to,
        text: body.text.trim(),
        idempotencyKey: result.id,
      });

      request.log.info(
        {
          event: 'whatsapp.send.enqueued',
          job_id: enqueueResult.jobId,
          message_id: result.id,
          conversation_id: body.conversation_id,
        },
        'Outbound WhatsApp message enqueued'
      );

      return reply.send({
        ok: true,
        message_id: result.id,
      });
    } catch (error) {
      if (error instanceof OutboundQueueFullError) {
        return reply.status(503).send({
          ok: false,
          error: {
            code: 'QUEUE_FULL',
            message: 'Queue full; try again later',
          },
        });
      }
      const code = (error as any)?.code;
      if (code === TARGET_NOT_FOUND) {
        return reply.status(404).send({
          ok: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Target phone not found for conversation',
          },
        });
      }
      if (error instanceof Error && (error.message.includes('WhatsApp') || error.message.includes('META_WHATSAPP') || error.message.includes('enqueueOutboundSend'))) {
        return reply.status(502).send({
          ok: false,
          error: {
            code: ERROR_CODES.WHATSAPP_SEND_FAILED,
            message: safeErrorMessage(error),
          },
        });
      }
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: {
          code: normalized.error,
          message: normalized.message || 'Failed to send outbound message',
        },
      });
    }
  });
}
