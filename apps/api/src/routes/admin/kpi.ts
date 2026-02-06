import { FastifyInstance } from 'fastify';
import { getAdminKPISnapshotReadModel } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminKPIRoutes(app: FastifyInstance) {
  app.get('/admin/kpi', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const snapshot = await getAdminKPISnapshotReadModel({ userId });
      return reply.send({ ok: true, snapshot });
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
