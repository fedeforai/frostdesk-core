import { FastifyInstance } from 'fastify';
import { getIntentConfidenceTelemetry } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminIntentConfidenceRoutes(app: FastifyInstance) {
  app.get('/admin/intent-confidence', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const query = request.query as {
        from?: string;
        to?: string;
      };

      const buckets = await getIntentConfidenceTelemetry({
        userId,
        from: query.from,
        to: query.to,
      });

      return reply.send({
        ok: true,
        buckets,
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
