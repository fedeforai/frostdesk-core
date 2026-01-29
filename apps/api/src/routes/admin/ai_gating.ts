import { FastifyInstance } from 'fastify';
import { getAIGatingDecision } from '@frostdesk/db/src/ai_gating_service.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function adminAIGatingRoutes(app: FastifyInstance) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/conversations/:conversationId/ai-gating', async (request, reply) => {
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

      const decision = await getAIGatingDecision({
        conversationId,
        userId,
      });

      return reply.send({
        ok: true,
        decision,
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
