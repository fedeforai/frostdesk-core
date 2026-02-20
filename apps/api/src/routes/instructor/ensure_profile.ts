import type { FastifyInstance } from 'fastify';
import { ensureInstructorProfile } from '@frostdesk/db';
import { getAuthUserFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

/**
 * POST /instructor/ensure-profile
 * Auth: Bearer JWT. Ensures instructor_profiles row exists for this user (get or create minimal pending row).
 * Used by instructor app gate on first login so admin sees pending and instructor sees approval-pending page.
 */
export async function instructorEnsureProfileRoutes(app: FastifyInstance): Promise<void> {
  app.post('/instructor/ensure-profile', async (request, reply) => {
    try {
      const { id: userId } = await getAuthUserFromJwt(request);
      const profile = await ensureInstructorProfile(userId);
      return reply.send({ ok: true, profile });
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
