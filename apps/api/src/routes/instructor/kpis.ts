/**
 * Instructor KPI endpoints (read-only, zero side effects).
 *
 *   GET /instructor/kpis/revenue?window=7d|30d|90d
 *   GET /instructor/kpis/funnel?window=7d|30d|90d
 *   GET /instructor/kpis/business?window=7d|30d|90d
 *
 * Auth: JWT. Ownership by instructor_id from profile.
 */
import type { FastifyInstance } from 'fastify';
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

export async function instructorKpisRoutes(app: FastifyInstance): Promise<void> {
  // ── Revenue KPI ──────────────────────────────────────────────────────────
  app.get('/instructor/kpis/revenue', async (request, reply) => {
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

      const window = parseWindow((request.query as Record<string, string>).window);
      const data = await getRevenueKpi(profile.id, window);
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

  // ── Funnel KPI ───────────────────────────────────────────────────────────
  app.get('/instructor/kpis/funnel', async (request, reply) => {
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

      const window = parseWindow((request.query as Record<string, string>).window);
      const data = await getFunnelKpi(profile.id, window);
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

  // ── Business KPI ─────────────────────────────────────────────────────────
  app.get('/instructor/kpis/business', async (request, reply) => {
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

      const window = parseWindow((request.query as Record<string, string>).window);
      const data = await getBusinessKpi(profile.id, window);
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
