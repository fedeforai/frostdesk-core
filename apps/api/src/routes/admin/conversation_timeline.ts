import type { FastifyInstance } from 'fastify';
import { getConversationTimelineReadModel } from '@frostdesk/db';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminConversationTimelineRoutes(
  fastify: FastifyInstance
) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  fastify.get(
    '/admin/conversations/:conversationId/timeline',
    async (request, reply) => {
      try {
        const userId = getUserId(request);
        const { conversationId } = request.params as {
          conversationId: string;
        };

        const events = await getConversationTimelineReadModel({
          userId,
          conversationId,
        });

        return {
          ok: true,
          events,
        };
      } catch (error) {
        const normalized = normalizeError(error);
        const status = mapErrorToHttp(normalized.error);

        return reply.status(status).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message
            ? { message: normalized.message }
            : {}),
        });
      }
    }
  );
}
