/**
 * Admin AI Cost Dashboard Endpoints
 *
 * GET /admin/ai/cost/summary?window=30d
 * GET /admin/ai/cost/instructors?window=30d&limit=50
 * GET /admin/ai/cost/conversations?window=7d&limit=100
 * GET /admin/ai/cost/spikes?window=7d
 *
 * Admin-only. Read-only. Separate from existing /admin/ai/metrics.
 */

import type { FastifyInstance } from 'fastify';
import {
  getAiCostSummary,
  getAiUsageByInstructor,
  getAiUsageByConversation,
  getAiCostSpikes,
} from '@frostdesk/db';
import type { AiUsageWindow } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const VALID_WINDOWS = new Set<string>(['7d', '30d', '90d']);

function parseWindow(raw?: string): AiUsageWindow {
  return VALID_WINDOWS.has(raw ?? '') ? (raw as AiUsageWindow) : '30d';
}

export async function adminAiCostRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /admin/ai/cost/summary ─────────────────────────────────────────
  fastify.get('/admin/ai/cost/summary', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string };
      const window = parseWindow(query.window);

      const summary = await getAiCostSummary(window);

      return {
        ok: true,
        data: {
          window: summary.window,
          total_cost_cents: summary.totalCostCents,
          total_tokens: summary.totalTokens,
          avg_cost_per_conversation: summary.avgCostPerConversation,
          avg_cost_per_booking_confirmed: summary.avgCostPerBookingConfirmed,
          top_operations_by_cost: summary.topOperationsByCost,
          top_instructors_by_cost: summary.topInstructorsByCost,
        },
      };
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // ── GET /admin/ai/cost/instructors ─────────────────────────────────────
  fastify.get('/admin/ai/cost/instructors', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string; limit?: string };
      const window = parseWindow(query.window);
      const limit = Math.min(50, Math.max(1, Number(query.limit) || 50));

      const instructors = await getAiUsageByInstructor(window, limit);

      return {
        ok: true,
        data: {
          window,
          instructors: instructors.map((i) => ({
            instructor_id: i.instructorId,
            total_cost_cents: i.totalCostCents,
            total_calls: i.totalCalls,
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

  // ── GET /admin/ai/cost/conversations ───────────────────────────────────
  fastify.get('/admin/ai/cost/conversations', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string; limit?: string };
      const window = parseWindow(query.window);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 100));

      const conversations = await getAiUsageByConversation(window, limit);

      return {
        ok: true,
        data: {
          window,
          conversations: conversations.map((c) => ({
            conversation_id: c.conversationId,
            instructor_id: c.instructorId,
            total_cost_cents: c.totalCostCents,
            total_calls: c.totalCalls,
            operations_breakdown: c.operationsBreakdown,
            last_activity_at: c.lastActivityAt,
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

  // ── GET /admin/ai/cost/spikes ──────────────────────────────────────────
  fastify.get('/admin/ai/cost/spikes', async (request, reply) => {
    try {
      await requireAdminUser(request);

      const query = request.query as { window?: string };
      const window = parseWindow(query.window);

      const spikes = await getAiCostSpikes(window);

      return {
        ok: true,
        data: {
          window,
          spikes: spikes.map((s) => ({
            conversation_id: s.conversationId,
            instructor_id: s.instructorId,
            total_cost_cents: s.totalCostCents,
            reason: s.reason,
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
