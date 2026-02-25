import { FastifyInstance } from 'fastify';
import { getOutboundQueueStats } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

/**
 * GET /admin/whatsapp/queue-stats — returns pending, dead_last_24h, sent_last_24h.
 * Admin only. For observability and support.
 */
export async function adminWhatsAppQueueRoutes(app: FastifyInstance) {
  app.get('/admin/whatsapp/queue-stats', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const stats = await getOutboundQueueStats();
      return reply.send({
        ok: true,
        pending: stats.pending,
        dead_last_24h: stats.dead_last_24h,
        sent_last_24h: stats.sent_last_24h,
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
