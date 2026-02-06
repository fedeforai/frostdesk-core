import { FastifyInstance } from 'fastify';
import { getHumanInbox } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
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
  app.get('/admin/human-inbox', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const { status, channel } = request.query as {
        status?: string;
        channel?: string;
      };

      const items = await getHumanInbox({
        userId,
        status,
        channel,
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
