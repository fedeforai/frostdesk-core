import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorGuardrails } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Instructor guardrails routes (read-only).
 * GET /instructor/guardrails — get AI guardrails (onboarding gate). Creates default row if missing.
 * Auth: JWT. No admin, no debug bypass.
 */
export async function instructorGuardrailsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/guardrails', async (request, reply) => {
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
          message: 'Onboarding must be completed to access guardrails',
        });
      }

      const guardrails = await getInstructorGuardrails(profile.id);
      return reply.send({
        ok: true,
        guardrails: {
          allow_discounts: guardrails.allow_discounts,
          allow_off_availability: guardrails.allow_off_availability,
          require_manual_review: guardrails.require_manual_review,
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
