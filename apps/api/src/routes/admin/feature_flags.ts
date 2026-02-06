import { FastifyInstance } from 'fastify';
import { getFeatureFlagStatus } from '../../services/feature_flag_service.js';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type Env = 'dev' | 'staging' | 'prod';

export async function adminFeatureFlagsRoutes(app: FastifyInstance) {
  app.get('/admin/feature-flags/:key', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const { key } = request.params as { key?: string };
      const { env, tenantId } = request.query as {
        env?: Env;
        tenantId?: string;
      };

      if (!key || !env) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      if (!['dev', 'staging', 'prod'].includes(env)) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_ENV });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const { enabled } = await getFeatureFlagStatus(
        {
          key,
          env,
          tenantId
        },
        userId
      );

      return reply.send({
        ok: true,
        enabled
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
