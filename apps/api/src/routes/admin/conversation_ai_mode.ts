import { FastifyInstance } from 'fastify';
import { setConversationAIModeAdmin } from '@frostdesk/db/src/conversation_service.js';
import { ConversationNotFoundError } from '@frostdesk/db/src/conversation_repository.js';
import { isValidUUID } from '@frostdesk/db/src/utils.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Admin Conversation AI Mode Routes (RALPH-SAFE)
 * 
 * WHAT IT DOES:
 * - Exposes POST /admin/conversations/:id/ai-mode endpoint
 * - Enforces admin access
 * - Updates ai_enabled flag in conversations table
 * 
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No outbound messages
 * - No automation
 * - No side effects beyond DB update
 */

export async function adminConversationAIModeRoutes(app: FastifyInstance) {
  // Helper to extract userId from request
  const getUserId = (request: any): string => {
    // Try header first, then query param
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.post('/admin/conversations/:id/ai-mode', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const conversationId = (request.params as any).id;
      const body = request.body as {
        enabled?: boolean;
      };

      // Validate conversationId: must be valid UUID
      if (!conversationId || typeof conversationId !== 'string') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing or invalid conversation ID',
          },
        });
      }

      if (!isValidUUID(conversationId)) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Invalid conversation ID format (must be UUID)',
          },
        });
      }

      // Validate enabled: must be boolean
      if (typeof body.enabled !== 'boolean') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Missing or invalid enabled field (must be boolean)',
          },
        });
      }

      // Call service (admin guard enforced inside service)
      await setConversationAIModeAdmin(conversationId, body.enabled, userId);

      return reply.send({
        ok: true,
      });
    } catch (error) {
      // Handle ConversationNotFoundError explicitly
      if (error instanceof ConversationNotFoundError) {
        const normalized = normalizeError({ code: ERROR_CODES.NOT_FOUND });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Conversation not found',
          },
        });
      }

      // Handle all other errors
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: {
          code: normalized.error,
          message: normalized.message || 'Failed to update AI mode',
        },
      });
    }
  });
}
