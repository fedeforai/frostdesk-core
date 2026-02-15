/**
 * AI Usage Telemetry Repository (Loop B)
 *
 * Append-only. Fail-open. Never blocks runtime.
 *
 * - insertAiUsageEvent()  → persists one AI call record
 * - getAiUsageSummary()   → aggregate metrics for admin dashboard
 * - getAiUsageByInstructor() → per-instructor breakdown (admin)
 */

import { sql } from './client.js';

// ── Insert ───────────────────────────────────────────────────────────────────

export interface InsertAiUsageEventParams {
  instructorId?: string | null;
  conversationId?: string | null;
  taskType: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEstimateCents: number;
  latencyMs?: number | null;
  timedOut?: boolean;
  errorCode?: string | null;
  requestId?: string | null;
}

/**
 * Inserts a single AI usage telemetry event.
 * Fail-open: swallows all errors and returns false on failure.
 */
export async function insertAiUsageEvent(
  params: InsertAiUsageEventParams,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO ai_usage_events (
        instructor_id,
        conversation_id,
        task_type,
        model,
        tokens_input,
        tokens_output,
        cost_estimate_cents,
        latency_ms,
        timed_out,
        error_code,
        request_id
      ) VALUES (
        ${params.instructorId ?? null}::uuid,
        ${params.conversationId ?? null}::uuid,
        ${params.taskType},
        ${params.model},
        ${params.tokensIn},
        ${params.tokensOut},
        ${params.costEstimateCents},
        ${params.latencyMs ?? null},
        ${params.timedOut ?? false},
        ${params.errorCode ?? null},
        ${params.requestId ?? null}
      )
    `;
    return true;
  } catch {
    // Fail-open: telemetry must never block.
    return false;
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

export type AiUsageWindow = '7d' | '30d' | '90d';

export interface AiUsageSummary {
  window: AiUsageWindow;
  totalCalls: number;
  totalCostCents: number;
  avgLatencyMs: number;
  timeoutRate: number;         // percentage 0–100
  errorRate: number;           // percentage 0–100
  modelUsage: Record<string, number>;
  topErrorCodes: Array<{ code: string; count: number }>;
}

const WINDOW_INTERVALS: Record<AiUsageWindow, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

/**
 * Aggregated AI usage metrics for the admin dashboard.
 * Single query, no heavy joins.
 */
export async function getAiUsageSummary(
  window: AiUsageWindow = '30d',
): Promise<AiUsageSummary> {
  const interval = WINDOW_INTERVALS[window];

  // Main aggregates
  const [agg] = await sql<Array<{
    total_calls: string;
    total_cost_cents: string;
    avg_latency_ms: string | null;
    timeout_count: string;
    error_count: string;
  }>>`
    SELECT
      COUNT(*)::text               AS total_calls,
      COALESCE(SUM(cost_estimate_cents), 0)::text AS total_cost_cents,
      AVG(latency_ms)::text        AS avg_latency_ms,
      COUNT(*) FILTER (WHERE timed_out = true)::text AS timeout_count,
      COUNT(*) FILTER (WHERE error_code IS NOT NULL)::text AS error_count
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
  `;

  const totalCalls = Number(agg?.total_calls ?? 0);
  const totalCostCents = Number(agg?.total_cost_cents ?? 0);
  const avgLatencyMs = Math.round(Number(agg?.avg_latency_ms ?? 0));
  const timeoutCount = Number(agg?.timeout_count ?? 0);
  const errorCount = Number(agg?.error_count ?? 0);
  const timeoutRate = totalCalls > 0 ? Math.round((timeoutCount / totalCalls) * 1000) / 10 : 0;
  const errorRate = totalCalls > 0 ? Math.round((errorCount / totalCalls) * 1000) / 10 : 0;

  // Model distribution
  const modelRows = await sql<Array<{ model: string; cnt: string }>>`
    SELECT model, COUNT(*)::text AS cnt
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
    GROUP BY model
    ORDER BY cnt DESC
  `;
  const modelUsage: Record<string, number> = {};
  for (const r of modelRows) {
    modelUsage[r.model] = Number(r.cnt);
  }

  // Top error codes
  const errorRows = await sql<Array<{ error_code: string; cnt: string }>>`
    SELECT error_code, COUNT(*)::text AS cnt
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
      AND error_code IS NOT NULL
    GROUP BY error_code
    ORDER BY cnt DESC
    LIMIT 10
  `;
  const topErrorCodes = errorRows.map((r) => ({
    code: r.error_code,
    count: Number(r.cnt),
  }));

  return {
    window,
    totalCalls,
    totalCostCents,
    avgLatencyMs,
    timeoutRate,
    errorRate,
    modelUsage,
    topErrorCodes,
  };
}

// ── Per-instructor breakdown ─────────────────────────────────────────────────

export interface InstructorAiUsage {
  instructorId: string;
  totalCalls: number;
  totalCostCents: number;
  avgLatencyMs: number;
  timeoutCount: number;
}

/**
 * Top instructors by AI cost (admin view).
 */
export async function getAiUsageByInstructor(
  window: AiUsageWindow = '30d',
  limit: number = 10,
): Promise<InstructorAiUsage[]> {
  const interval = WINDOW_INTERVALS[window];

  const rows = await sql<Array<{
    instructor_id: string;
    total_calls: string;
    total_cost_cents: string;
    avg_latency_ms: string | null;
    timeout_count: string;
  }>>`
    SELECT
      instructor_id::text,
      COUNT(*)::text AS total_calls,
      COALESCE(SUM(cost_estimate_cents), 0)::text AS total_cost_cents,
      AVG(latency_ms)::text AS avg_latency_ms,
      COUNT(*) FILTER (WHERE timed_out = true)::text AS timeout_count
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
      AND instructor_id IS NOT NULL
    GROUP BY instructor_id
    ORDER BY total_cost_cents DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    instructorId: r.instructor_id,
    totalCalls: Number(r.total_calls),
    totalCostCents: Number(r.total_cost_cents),
    avgLatencyMs: Math.round(Number(r.avg_latency_ms ?? 0)),
    timeoutCount: Number(r.timeout_count),
  }));
}

// ── Per-conversation breakdown ───────────────────────────────────────────────

export interface ConversationAiUsage {
  conversationId: string;
  instructorId: string | null;
  totalCostCents: number;
  totalCalls: number;
  operationsBreakdown: Record<string, number>;
  lastActivityAt: string | null;
}

/**
 * Top conversations by AI cost (admin cost view).
 */
export async function getAiUsageByConversation(
  window: AiUsageWindow = '7d',
  limit: number = 100,
): Promise<ConversationAiUsage[]> {
  const interval = WINDOW_INTERVALS[window];

  const rows = await sql<Array<{
    conversation_id: string;
    instructor_id: string | null;
    total_cost_cents: string;
    total_calls: string;
    last_activity_at: string | null;
  }>>`
    SELECT
      conversation_id::text,
      MAX(instructor_id)::text AS instructor_id,
      COALESCE(SUM(cost_estimate_cents), 0)::text AS total_cost_cents,
      COUNT(*)::text AS total_calls,
      MAX(created_at)::text AS last_activity_at
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
      AND conversation_id IS NOT NULL
    GROUP BY conversation_id
    ORDER BY total_cost_cents DESC
    LIMIT ${limit}
  `;

  // Fetch per-operation breakdown for top conversations
  const conversationIds = rows.map((r) => r.conversation_id);

  const opRows = conversationIds.length > 0
    ? await sql<Array<{
        conversation_id: string;
        task_type: string;
        cnt: string;
      }>>`
        SELECT conversation_id::text, task_type, COUNT(*)::text AS cnt
        FROM ai_usage_events
        WHERE created_at >= now() - ${interval}::interval
          AND conversation_id = ANY(${conversationIds}::uuid[])
        GROUP BY conversation_id, task_type
      `
    : [];

  // Build per-conversation breakdown map
  const breakdownMap = new Map<string, Record<string, number>>();
  for (const op of opRows) {
    if (!breakdownMap.has(op.conversation_id)) {
      breakdownMap.set(op.conversation_id, {});
    }
    breakdownMap.get(op.conversation_id)![op.task_type] = Number(op.cnt);
  }

  return rows.map((r) => ({
    conversationId: r.conversation_id,
    instructorId: r.instructor_id,
    totalCostCents: Number(r.total_cost_cents),
    totalCalls: Number(r.total_calls),
    operationsBreakdown: breakdownMap.get(r.conversation_id) ?? {},
    lastActivityAt: r.last_activity_at,
  }));
}

// ── Cost spike detection ─────────────────────────────────────────────────────

export interface AiCostSpike {
  conversationId: string;
  instructorId: string | null;
  totalCostCents: number;
  reason: 'above_p95' | 'above_hard_threshold';
}

/** Hard cost threshold per conversation (in cents). Above this = spike. */
const SPIKE_HARD_THRESHOLD_CENTS = 100; // $1 per conversation

/**
 * Detects conversations with unusually high AI cost.
 * Uses p95 + hard threshold dual check.
 */
export async function getAiCostSpikes(
  window: AiUsageWindow = '7d',
): Promise<AiCostSpike[]> {
  const interval = WINDOW_INTERVALS[window];

  // Get p95 cost per conversation
  const [p95Row] = await sql<Array<{ p95: string | null }>>`
    SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY conv_cost)::text AS p95
    FROM (
      SELECT SUM(cost_estimate_cents) AS conv_cost
      FROM ai_usage_events
      WHERE created_at >= now() - ${interval}::interval
        AND conversation_id IS NOT NULL
      GROUP BY conversation_id
    ) sub
  `;
  const p95 = Number(p95Row?.p95 ?? 0);

  // Effective threshold: max of p95 and hard threshold
  const threshold = Math.max(p95, SPIKE_HARD_THRESHOLD_CENTS);

  const rows = await sql<Array<{
    conversation_id: string;
    instructor_id: string | null;
    total_cost_cents: string;
  }>>`
    SELECT
      conversation_id::text,
      MAX(instructor_id)::text AS instructor_id,
      SUM(cost_estimate_cents)::text AS total_cost_cents
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
      AND conversation_id IS NOT NULL
    GROUP BY conversation_id
    HAVING SUM(cost_estimate_cents) > ${threshold}
    ORDER BY total_cost_cents DESC
    LIMIT 50
  `;

  return rows.map((r) => ({
    conversationId: r.conversation_id,
    instructorId: r.instructor_id,
    totalCostCents: Number(r.total_cost_cents),
    reason: Number(r.total_cost_cents) > SPIKE_HARD_THRESHOLD_CENTS
      ? 'above_hard_threshold' as const
      : 'above_p95' as const,
  }));
}

// ── Enriched cost summary (with booking correlation) ─────────────────────────

export interface AiCostSummary {
  window: AiUsageWindow;
  totalCostCents: number;
  totalTokens: number;
  avgCostPerConversation: number;
  avgCostPerBookingConfirmed: number;
  topOperationsByCost: Array<{ operation: string; costCents: number; calls: number }>;
  topInstructorsByCost: Array<{ instructorId: string; costCents: number }>;
}

/**
 * Enriched cost summary for the admin cost dashboard.
 * Includes average cost per confirmed booking (cross-table join).
 */
export async function getAiCostSummary(
  window: AiUsageWindow = '30d',
): Promise<AiCostSummary> {
  const interval = WINDOW_INTERVALS[window];

  // Aggregates
  const [agg] = await sql<Array<{
    total_cost_cents: string;
    total_tokens: string;
    conversation_count: string;
  }>>`
    SELECT
      COALESCE(SUM(cost_estimate_cents), 0)::text AS total_cost_cents,
      COALESCE(SUM(tokens_input + tokens_output), 0)::text AS total_tokens,
      COUNT(DISTINCT conversation_id)::text AS conversation_count
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
  `;

  const totalCostCents = Number(agg?.total_cost_cents ?? 0);
  const totalTokens = Number(agg?.total_tokens ?? 0);
  const conversationCount = Number(agg?.conversation_count ?? 1);
  const avgCostPerConversation = conversationCount > 0
    ? Math.round(totalCostCents / conversationCount)
    : 0;

  // Confirmed bookings in window (fail-open if bookings table doesn't exist)
  let confirmedBookings = 0;
  try {
    const [bkRow] = await sql<Array<{ cnt: string }>>`
      SELECT COUNT(*)::text AS cnt
      FROM bookings
      WHERE status IN ('confirmed', 'completed')
        AND updated_at >= now() - ${interval}::interval
    `;
    confirmedBookings = Number(bkRow?.cnt ?? 0);
  } catch { /* bookings table may not exist */ }

  const avgCostPerBookingConfirmed = confirmedBookings > 0
    ? Math.round(totalCostCents / confirmedBookings)
    : 0;

  // Top operations by cost
  const opRows = await sql<Array<{
    task_type: string;
    cost_cents: string;
    calls: string;
  }>>`
    SELECT
      task_type,
      COALESCE(SUM(cost_estimate_cents), 0)::text AS cost_cents,
      COUNT(*)::text AS calls
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
    GROUP BY task_type
    ORDER BY cost_cents DESC
    LIMIT 10
  `;

  const topOperationsByCost = opRows.map((r) => ({
    operation: r.task_type,
    costCents: Number(r.cost_cents),
    calls: Number(r.calls),
  }));

  // Top instructors by cost
  const instrRows = await sql<Array<{
    instructor_id: string;
    cost_cents: string;
  }>>`
    SELECT
      instructor_id::text,
      COALESCE(SUM(cost_estimate_cents), 0)::text AS cost_cents
    FROM ai_usage_events
    WHERE created_at >= now() - ${interval}::interval
      AND instructor_id IS NOT NULL
    GROUP BY instructor_id
    ORDER BY cost_cents DESC
    LIMIT 10
  `;

  const topInstructorsByCost = instrRows.map((r) => ({
    instructorId: r.instructor_id,
    costCents: Number(r.cost_cents),
  }));

  return {
    window,
    totalCostCents,
    totalTokens,
    avgCostPerConversation,
    avgCostPerBookingConfirmed,
    topOperationsByCost,
    topInstructorsByCost,
  };
}
