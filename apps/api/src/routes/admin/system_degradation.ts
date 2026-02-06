import { FastifyInstance } from 'fastify';
import { getSystemDegradationSignalsReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminSystemDegradationRoutes(app: FastifyInstance) {
  app.get('/admin/system-degradation', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);

      const snapshot = await getSystemDegradationSignalsReadModel({ userId });

      return reply.send({
        ok: true,
        snapshot,
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
