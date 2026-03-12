import { FastifyInstance } from 'fastify';
import { getComprehensiveDashboardReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { getDashboardCache, setDashboardCache } from '../../lib/dashboard_cache.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminDashboardComprehensiveRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard-comprehensive', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);

      const cached = getDashboardCache();
      if (cached) {
        return reply
          .header('Cache-Control', 'no-store')
          .send({ ok: true, data: cached.data });
      }

      const data = await getComprehensiveDashboardReadModel({ userId });
      setDashboardCache(data);
      return reply
        .header('Cache-Control', 'no-store')
        .send({ ok: true, data });
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
