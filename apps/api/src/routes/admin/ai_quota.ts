import { FastifyInstance } from 'fastify';
import { getAIQuotaStatus } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminAIQuotaRoutes(app: FastifyInstance) {
  app.get('/admin/ai-quota', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as {
        channel?: string;
        period?: string;
      };

      const today = new Date();
      const period = query.period || today.toISOString().split('T')[0];
      const channel = query.channel || 'whatsapp';

      const quota = await getAIQuotaStatus({
        channel,
        period,
      });

      if (!quota) {
        return reply.send({
          ok: true,
          quota: null,
        });
      }

      return reply.send({
        ok: true,
        quota: {
          channel: quota.channel,
          period: quota.period,
          max_allowed: quota.max_allowed,
          used: quota.used,
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
