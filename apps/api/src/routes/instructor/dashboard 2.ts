/**
 * Instructor dashboard: single GET returning aggregated data.
 * Auth: JWT. Ownership by instructor_id from profile.
 */

import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorDashboardData } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function instructorDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/dashboard', async (request, reply) => {
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
      const data = await getInstructorDashboardData(profile.id);
      return reply.send(data);
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
