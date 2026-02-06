import { FastifyInstance } from 'fastify';
import { getAdminDashboardMetricsReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const metrics = await getAdminDashboardMetricsReadModel({ userId });
      return reply.send({ ok: true, metrics });
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
