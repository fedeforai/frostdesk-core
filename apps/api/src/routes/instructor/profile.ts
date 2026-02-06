import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, updateInstructorProfileByUserId } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Instructor profile routes (read/update). Auth: JWT.
 */
export async function instructorProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/profile', async (request, reply) => {
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
      return reply.send({
        ok: true,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          base_resort: profile.base_resort,
          working_language: profile.working_language,
          contact_email: profile.contact_email,
          onboarding_completed_at: profile.onboarding_completed_at ?? null,
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

  app.patch('/instructor/profile', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const body = request.body as Record<string, unknown>;
      const full_name = typeof body.full_name === 'string' ? body.full_name : '';
      const base_resort = typeof body.base_resort === 'string' ? body.base_resort : '';
      const working_language = typeof body.working_language === 'string' ? body.working_language : '';
      const contact_email = typeof body.contact_email === 'string' ? body.contact_email : '';
      const updated = await updateInstructorProfileByUserId({
        userId,
        full_name,
        base_resort,
        working_language,
        contact_email,
      });
      return reply.send({
        ok: true,
        profile: {
          id: updated.id,
          full_name: updated.full_name,
          base_resort: updated.base_resort,
          working_language: updated.working_language,
          contact_email: updated.contact_email,
          onboarding_completed_at: (updated as { onboarding_completed_at?: string | null }).onboarding_completed_at ?? null,
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
