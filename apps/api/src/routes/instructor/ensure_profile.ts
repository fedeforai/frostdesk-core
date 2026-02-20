import type { FastifyInstance } from 'fastify';
import { ensureInstructorProfile } from '@frostdesk/db';
import { getAuthUserFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const ENDPOINT = 'POST /instructor/ensure-profile';

/**
 * POST /instructor/ensure-profile
 * Auth: Bearer JWT. Ensures instructor_profiles row exists for this user (get or create minimal pending row).
 * Used by instructor app gate on first login so admin sees pending and instructor sees approval-pending page.
 */
export async function instructorEnsureProfileRoutes(app: FastifyInstance): Promise<void> {
  app.post('/instructor/ensure-profile', async (request, reply) => {
    let userIdPresent = false;
    try {
      const { id: userId } = await getAuthUserFromJwt(request);
      userIdPresent = true;
      const profile = await ensureInstructorProfile(userId);
      return reply.send({ ok: true, profile });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      request.log.warn(
        {
          request_id: (request as { id?: string }).id ?? null,
          endpoint: ENDPOINT,
          error: normalized.error,
          userIdPresent,
        },
        '[ensure-profile] request failed'
      );
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
}
