import { FastifyInstance } from 'fastify';
import { approveAndSendAIDraft } from '@frostdesk/db/src/ai_draft_send_service.js';
import { DraftNotFoundError } from '@frostdesk/db/src/ai_draft_send_repository.js';
import { sendWhatsAppText } from '../../integrations/whatsapp_cloud_api.js';
import { resolveWhatsAppTargetPhone, TARGET_NOT_FOUND } from '../../integrations/whatsapp_target_resolution.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/** Safe message for API response: no full body, max length. */
function safeErrorMessage(err: Error): string {
  const msg = err?.message ?? 'Unknown error';
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
}

export async function adminSendAIDraftRoutes(app: FastifyInstance) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.post('/admin/conversations/:conversationId/send-ai-draft', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const conversationId = (request.params as any).conversationId;

      if (!conversationId || typeof conversationId !== 'string') {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const result = await approveAndSendAIDraft({
        conversationId,
        userId,
      });

      const to = await resolveWhatsAppTargetPhone(conversationId);
      await sendWhatsAppText({
        to,
        text: result.text,
        context: { conversationId, messageId: result.message_id },
      });

      return reply.send({
        ok: true,
        message_id: result.message_id,
      });
    } catch (error) {
      if (error instanceof DraftNotFoundError) {
        const normalized = normalizeError({ code: ERROR_CODES.NOT_FOUND });
        return reply.status(404).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }
      const code = (error as any)?.code;
      if (code === TARGET_NOT_FOUND) {
        const normalized = normalizeError({ code: ERROR_CODES.NOT_FOUND });
        return reply.status(404).send({
          ok: false,
          error: normalized.error,
          message: normalized.message ?? 'Target phone not found for conversation',
        });
      }
      if (error instanceof Error && (error.message.includes('WhatsApp') || error.message.includes('META_WHATSAPP') || error.message.includes('sendWhatsAppText'))) {
        return reply.status(502).send({
          ok: false,
          error: ERROR_CODES.WHATSAPP_SEND_FAILED,
          message: safeErrorMessage(error),
        });
      }
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
}
