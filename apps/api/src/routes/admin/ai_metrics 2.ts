/**
 * Admin AI Metrics (Loop B)
 *
 * GET /admin/ai/metrics?window=30d
 * GET /admin/ai/metrics/by-instructor?window=30d&limit=10
 *
 * Admin-only. Read-only. No instructor exposure.
 */

import type { FastifyInstance } from 'fastify';
import {
  getAiUsageSummary,
  getAiUsageByInstructor,
} from '@frostdesk/db';
import type { AiUsageWindow } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const VALID_WINDOWS = new Set<string>(['7d', '30d', '90d']);

export async function adminAiMetricsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /admin/ai/metrics?window=30d
   *
   * Returns aggregated AI usage summary:
   *   totalCalls, totalCostCents, avgLatencyMs, timeoutRate,
   *   errorRate, modelUsage, topErrorCodes
   */
  fastify.get('/admin/ai/metrics', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string };
      const window: AiUsageWindow = VALID_WINDOWS.has(query.window ?? '')
        ? (query.window as AiUsageWindow)
        : '30d';

      const summary = await getAiUsageSummary(window);

      return {
        ok: true,
        data: {
          window: summary.window,
          total_calls: summary.totalCalls,
          total_cost_cents: summary.totalCostCents,
          avg_latency_ms: summary.avgLatencyMs,
          timeout_rate: summary.timeoutRate,
          error_rate: summary.errorRate,
          model_usage: summary.modelUsage,
          top_error_codes: summary.topErrorCodes,
        },
      };
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  /**
   * GET /admin/ai/metrics/by-instructor?window=30d&limit=10
   *
   * Returns top instructors by AI cost.
   */
  fastify.get('/admin/ai/metrics/by-instructor', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string; limit?: string };
      const window: AiUsageWindow = VALID_WINDOWS.has(query.window ?? '')
        ? (query.window as AiUsageWindow)
        : '30d';
      const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

      const instructors = await getAiUsageByInstructor(window, limit);

      return {
        ok: true,
        data: {
          window,
          instructors: instructors.map((i) => ({
            instructor_id: i.instructorId,
            total_calls: i.totalCalls,
            total_cost_cents: i.totalCostCents,
            avg_latency_ms: i.avgLatencyMs,
            timeout_count: i.timeoutCount,
          })),
        },
      };
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
