import { FastifyInstance } from 'fastify';
import { getAIQuotaStatus } from '@frostdesk/db/src/ai_quota_repository.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminAIQuotaRoutes(app: FastifyInstance) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/ai-quota', async (request, reply) => {
    try {
      getUserId(request);

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
