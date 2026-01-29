import { FastifyInstance } from 'fastify';
import { generateAndStoreAIDraft } from '@frostdesk/db/src/ai_draft_service.js';
import { getMessagesByConversation } from '@frostdesk/db/src/message_repository.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function adminAIDraftRoutes(app: FastifyInstance) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/conversations/:conversationId/ai-draft', async (request, reply) => {
    try {
      const userId = getUserId(request);
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
