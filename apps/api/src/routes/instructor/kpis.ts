/**
 * Instructor KPI endpoints (read-only, zero side effects).
 *
 *   GET /instructor/kpis/revenue?window=7d|30d|90d
 *   GET /instructor/kpis/funnel?window=7d|30d|90d
 *   GET /instructor/kpis/business?window=7d|30d|90d
 *
 * Auth: JWT. Ownership by instructor_id from profile.
 * Instrumentation: timing. Hard timeout to avoid Vercel FUNCTION_INVOCATION_TIMEOUT.
 */
import type { FastifyInstance } from 'fastify';
import type { KpiWindow } from '@frostdesk/db';
import {
  getInstructorProfileByUserId,
  getRevenueKpi,
  getFunnelKpi,
  getBusinessKpi,
  parseWindow,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';
import { now, logTiming, withTimeout } from '../../lib/timing.js';

const KPI_QUERY_TIMEOUT_MS = 10_000;

async function handleKpiRoute(
  route: string,
  request: { query?: Record<string, string> },
  reply: { status: (n: number) => { send: (v: unknown) => unknown }; send: (v: unknown) => unknown },
  fetchData: (instructorId: string, window: KpiWindow) => Promise<unknown>
): Promise<unknown> {
  const routeStart = now();
  const t0 = now();
  const userId = await getUserIdFromJwt(request as any);
  logTiming(route, 'getUserIdFromJwt', t0);
  const t1 = now();
  const profile = await getInstructorProfileByUserId(userId);
  logTiming(route, 'getInstructorProfileByUserId', t1);
  if (!profile) {
    return reply.status(404).send({
      ok: false,
      error: { code: ERROR_CODES.NOT_FOUND },
      message: 'Instructor profile not found',
    });
  }
  const window = parseWindow((request.query as Record<string, string>)?.window);
  const t2 = now();
  try {
    const data = await withTimeout(fetchData(profile.id, window), KPI_QUERY_TIMEOUT_MS, route);
    logTiming(route, 'kpi_query', t2);
    logTiming(route, 'total', routeStart);
    return reply.send(data);
  } catch (err) {
    if (err instanceof Error && err.message.includes('timed out')) {
      logTiming(route, 'kpi_query_timeout', t2);
      return reply.status(503).send({
        ok: false,
        error: 'INTERNAL_ERROR',
        message: 'KPI query timed out',
      });
    }
    throw err;
  }
}

export async function instructorKpisRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/kpis/revenue', async (request, reply) => {
    try {
      return await handleKpiRoute(
        'GET /instructor/kpis/revenue',
        request as any,
        reply,
        (id, w) => getRevenueKpi(id, w)
      );
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

  app.get('/instructor/kpis/funnel', async (request, reply) => {
    try {
      return await handleKpiRoute(
        'GET /instructor/kpis/funnel',
        request as any,
        reply,
        (id, w) => getFunnelKpi(id, w)
      );
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

  app.get('/instructor/kpis/business', async (request, reply) => {
    try {
      return await handleKpiRoute(
        'GET /instructor/kpis/business',
        request as any,
        reply,
        (id, w) => getBusinessKpi(id, w)
      );
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
