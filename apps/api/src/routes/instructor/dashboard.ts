/**
 * Instructor dashboard: single GET returning aggregated data.
 * Auth: JWT. Ownership by instructor_id from profile.
 * Instrumentation: timing logs. Fast-path: minimal payload if slow to avoid Vercel FUNCTION_INVOCATION_TIMEOUT.
 */

import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorDashboardData } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';
import { now, elapsedMs, logTiming, withTimeout } from '../../lib/timing.js';

const ROUTE = 'GET /instructor/dashboard';
const ROUTE_TIMEOUT_MS = 15_000;
const FAST_PATH_MS = 8_000;
const DASHBOARD_DATA_TIMEOUT_MS = 10_000;

function minimalDashboardPayload(profile: { id: string; full_name?: string | null; working_language?: string | null; base_resort?: string | null }) {
  return {
    instructor: {
      id: profile.id,
      name: profile.full_name ?? '',
      languages: profile.working_language ?? '',
      resort_base: profile.base_resort ?? '',
      country: null,
    },
    services: [],
    meetingPoints: [],
    policies: [],
    availability: [],
    calendar: { connected: false, calendarId: null, lastSyncAt: null },
    upcomingBookings: [],
    _fastPath: true,
  };
}

export async function instructorDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/dashboard', async (request, reply) => {
    const routeStart = now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard route timeout')), ROUTE_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([
        (async () => {
          const t0 = now();
          const userId = await getUserIdFromJwt(request);
          logTiming(ROUTE, 'getUserIdFromJwt', t0);

          const t1 = now();
          const profile = await getInstructorProfileByUserId(userId);
          logTiming(ROUTE, 'getInstructorProfileByUserId', t1);

          if (!profile) {
            return reply.status(404).send({
              ok: false,
              error: { code: ERROR_CODES.NOT_FOUND },
              message: 'Instructor profile not found',
            });
          }

          if (elapsedMs(routeStart) > FAST_PATH_MS) {
            logTiming(ROUTE, 'fastPath_skip_heavy', routeStart, { reason: 'elapsed_before_data' });
            return reply.send(minimalDashboardPayload(profile));
          }

          const t2 = now();
          let data;
          try {
            data = await withTimeout(
              getInstructorDashboardData(profile.id),
              DASHBOARD_DATA_TIMEOUT_MS,
              'getInstructorDashboardData'
            );
          } catch (err) {
            if (err instanceof Error && err.message.includes('timed out')) {
              logTiming(ROUTE, 'getInstructorDashboardData_timeout', t2);
              return reply.send(minimalDashboardPayload(profile));
            }
            throw err;
          }
          logTiming(ROUTE, 'getInstructorDashboardData', t2);
          logTiming(ROUTE, 'total', routeStart);
          return reply.send(data);
        })(),
        timeoutPromise,
      ]);
      return result;
    } catch (error) {
      console.error('[dashboard]', { error });
      if (error instanceof Error && error.message === 'Dashboard route timeout') {
        logTiming(ROUTE, 'route_timeout', routeStart);
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
