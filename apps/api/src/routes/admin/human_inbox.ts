import { FastifyInstance } from 'fastify';
import { getHumanInbox } from '@frostdesk/db';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Admin Human Inbox Routes (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Exposes GET /admin/human-inbox endpoint
 * - Enforces admin access via service layer
 * - Returns human inbox read model
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No SQL
 * - No business logic
 * - No direct repository calls
 */

export async function adminHumanInboxRoutes(app: FastifyInstance) {
  // Helper to extract userId from request
  const getUserId = (request: any): string => {
    // Try header first, then query param
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/human-inbox', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { status, channel } = request.query as {
        status?: string;
        channel?: string;
      };

      // Pilot/local: skip admin check when ALLOW_DEBUG_USER=1|true and userId=debug-user (env read only in API layer)
      const ALLOW_DEBUG_USER = process.env.ALLOW_DEBUG_USER;
      const skip =
        (ALLOW_DEBUG_USER === '1' || ALLOW_DEBUG_USER === 'true') && userId === 'debug-user';
      console.log('🧪 ADMIN INBOX DEBUG', { userId, ALLOW_DEBUG_USER, skip });

      const items = await getHumanInbox({
        userId,
        status,
        channel,
        _skipAdminCheck: skip,
      });

      return reply.send({
        ok: true,
        items,
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
