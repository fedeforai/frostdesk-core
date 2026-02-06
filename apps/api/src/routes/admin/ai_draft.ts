import { FastifyInstance } from 'fastify';
import { generateAndStoreAIDraft, getMessagesByConversation } from '@frostdesk/db';
import { generateDraftReply } from '../../ai/generate_draft_reply.js';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function adminAIDraftRoutes(app: FastifyInstance) {
  app.get('/admin/conversations/:conversationId/ai-draft', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const { conversationId } = request.params as { conversationId?: string };

      if (!conversationId) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const messages = await getMessagesByConversation(conversationId);
      const latestInboundMessage = messages
        .filter(m => m.direction === 'inbound')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      const latestMessageText = latestInboundMessage?.content || '';

      const draft = await generateAndStoreAIDraft({
        conversationId,
        latestMessageText,
        userId,
        generateDraft: generateDraftReply,
      });

      return reply.send({
        ok: true,
        draft: {
          text: draft.text,
          model: draft.model,
          created_at: draft.created_at,
        },
      });
    } catch (error) {
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
