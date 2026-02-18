/**
 * Structured Logger
 *
 * JSON-to-stdout. No external service yet.
 * Every log line is a single JSON object with deterministic keys.
 *
 * Three entry-points:
 *   logRequest()  — one line per HTTP request (response phase)
 *   logAiSpan()   — one line per LLM / AI call
 *   logError()    — one line per caught error
 *
 * All are fire-and-forget; they never throw.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface RequestLogPayload {
  request_id: string;
  route: string;
  method: string;
  instructor_id?: string | null;
  latency_ms: number;
  status_code: number;
  error_code?: string | null;
}

export interface AiSpanPayload {
  request_id?: string | null;
  instructor_id?: string | null;
  conversation_id?: string | null;
  task: string;                      // e.g. 'intent_classification', 'draft_generation'
  model: string;                     // e.g. 'gpt-4o-mini', 'gpt-4o', 'stub-v1'
  tokens_in?: number | null;
  tokens_out?: number | null;
  latency_ms: number;
  timed_out: boolean;
  confidence_band?: string | null;   // A_CERTAIN .. E_UNKNOWN
  cost_estimate_usd?: number | null; // rough estimate
}

export interface ErrorLogPayload {
  request_id?: string | null;
  route?: string | null;
  instructor_id?: string | null;
  error_code?: string | null;
  message: string;
  stack?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emit(level: 'info' | 'warn' | 'error', type: string, data: Record<string, unknown>): void {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      type,
      ...data,
    });
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } catch {
    // Logger must never throw.
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Log a completed HTTP request. Call from response hook / onResponse. */
export function logRequest(payload: RequestLogPayload): void {
  emit('info', 'http_request', payload as unknown as Record<string, unknown>);
}

/** Log a single AI / LLM call span (classification, draft, etc.). */
export function logAiSpan(payload: AiSpanPayload): void {
  emit('info', 'ai_span', payload as unknown as Record<string, unknown>);
}

/** Log a caught error with context. */
export function logError(payload: ErrorLogPayload): void {
  emit('error', 'error', payload as unknown as Record<string, unknown>);
}

// ── Cost estimation helper ───────────────────────────────────────────────────

/**
 * Rough token-based cost estimate (USD).
 *
 * Prices are approximate and should be updated periodically.
 * Returns null when token counts are missing.
 */
export function estimateAiCostUsd(
  model: string,
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined,
): number | null {
  if (tokensIn == null || tokensOut == null) return null;

  // Approximate per-1M-token pricing (USD) as of 2026-02
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini':   { input: 0.15,  output: 0.60 },
    'gpt-4o':        { input: 2.50,  output: 10.0 },
    'gpt-4.1-mini':  { input: 0.40,  output: 1.60 },
    'gpt-4.1-nano':  { input: 0.10,  output: 0.40 },
  };

  const p = pricing[model];
  if (!p) return null;

  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}
