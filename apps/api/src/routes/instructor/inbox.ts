import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorInbox } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Instructor inbox routes (read-only v1).
 * GET /instructor/inbox — list conversations for this instructor (onboarding gate).
 * No reply, no escalation, no AI, no webhook — visibility only.
 * Auth: JWT. No admin, no debug bypass.
 */
export async function instructorInboxRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/inbox', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access inbox',
        });
      }

      const items = await getInstructorInbox(profile.id);
      return reply.send({
        ok: true,
        items,
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
