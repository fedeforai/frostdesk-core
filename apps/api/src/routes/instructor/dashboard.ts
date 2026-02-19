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

const ROUTE_TIMEOUT_MS = 25_000;

export async function instructorDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/dashboard', async (request, reply) => {
    console.log('ENV CHECK:', {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: !!process.env.SUPABASE_URL,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      anon: !!process.env.SUPABASE_ANON_KEY,
      nextAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      database: !!process.env.DATABASE_URL,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard route timeout')), ROUTE_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        (async () => {
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
        })(),
        timeoutPromise,
      ]);
      return result;
    } catch (error) {
      console.error('Dashboard error:', error);
      if (error instanceof Error && error.message === 'Dashboard route timeout') {
        return reply.status(503).send({
          ok: false,
          error: 'INTERNAL_ERROR',
          message: 'Service temporarily unavailable',
        });
      }
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
