import { FastifyInstance } from 'fastify';
import { approveAndSendAIDraft, insertAuditEvent, DraftNotFoundError } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
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
  app.post('/admin/conversations/:conversationId/send-ai-draft', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
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

      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId,
          action: 'admin_send_ai_draft',
          entity_type: 'conversation',
          entity_id: conversationId,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: { message_id: result.message_id },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (admin send AI draft)');
      }
      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId ?? null,
          action: 'ai_draft_approved',
          entity_type: 'conversation',
          entity_id: conversationId,
          severity: 'info',
          request_id: request.id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: {
            draft_id: null,
            outbound_message_id: result.message_id,
          },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (ai_draft_approved)');
      }
      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId,
          action: 'ai_draft_decision',
          entity_type: 'conversation',
          entity_id: conversationId,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: { decision: 'approved' },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (ai_draft_decision)');
      }
      try {
        await insertAuditEvent({
          actor_type: 'system',
          actor_id: null,
          action: 'ai_draft_sent',
          entity_type: 'conversation',
          entity_id: conversationId,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: null,
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (ai_draft_sent)');
      }

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
