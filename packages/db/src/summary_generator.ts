/**
 * Summary Generator
 *
 * Orchestrates the full summary pipeline:
 *   1. Builds compact state + prompt from inputs
 *   2. Calls cheap LLM via ai_router (summary_update task)
 *   3. Validates output (length, parsability)
 *   4. Returns SummaryOutput for persistence
 *
 * Fail-open: returns null if any step fails.
 * Never throws. Never blocks.
 */

import {
  runAiTask,
  withTimeout,
  AI_TIMEOUT,
  type SummaryGenerationOutput,
  type AiUsageEvent,
} from '@frostdesk/ai';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SummaryInput {
  /** Existing summary text (null for bootstrap). */
  previousSummary: string | null;
  /** Recent messages in chronological order. */
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Loop C structured context (last duration, level, etc.). */
  structuredContext: string | null;
  /** Current booking draft signals, if any. */
  bookingSnapshot: string | null;
  /** Current classified intent (e.g. 'NEW_BOOKING', 'INFO_REQUEST'). */
  currentIntent: string | null;
  // Telemetry
  instructorId?: string | null;
  conversationId?: string | null;
  requestId?: string | null;
  onUsage?: (event: AiUsageEvent) => void;
}

export interface SummaryOutput {
  summaryText: string;
  summaryJson: Record<string, unknown>;
  confidenceBand: string;
  nextQuestions: string[];
  missingFields: string[];
}

// ── Config ───────────────────────────────────────────────────────────────────

/** Max characters for summaryText output. ~120 tokens ≈ 480 chars. */
const MAX_SUMMARY_CHARS = 500;
/** Max characters for summaryJson serialized. */
const MAX_SUMMARY_JSON_CHARS = 700;
/** Timeout for summary generation (cheap model). */
const SUMMARY_TIMEOUT_MS = 3000;

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Generates (or incrementally updates) a conversation summary.
 * Uses the cheap model tier. Returns null on any failure.
 */
export async function generateSummary(
  input: SummaryInput,
): Promise<SummaryOutput | null> {
  try {
    const prompt = buildSummaryPrompt(input);

    const task = runAiTask({
      task: 'summary_update',
      input: prompt,
      context: [prompt], // provide full prompt as context
      instructorId: input.instructorId,
      conversationId: input.conversationId,
      requestId: input.requestId,
      onUsage: input.onUsage,
    });

    const result = await withTimeout(task, SUMMARY_TIMEOUT_MS);

    if (result.timedOut || !result.result) {
      return null;
    }

    const data = result.result.data as SummaryGenerationOutput | null;
    if (!data) return null;

    // Validate output
    return validateSummaryOutput(data);
  } catch {
    return null;
  }
}

// ── Prompt Builder ───────────────────────────────────────────────────────────

function buildSummaryPrompt(input: SummaryInput): string {
  const mode = input.previousSummary ? 'incremental_merge' : 'bootstrap';

  const parts: string[] = [
    'You are a conversation summarizer for a ski instructor booking platform.',
    'Generate a compact JSON summary of the conversation state.',
    '',
    `Mode: ${mode}`,
    '',
  ];

  if (input.previousSummary) {
    parts.push('Previous summary:');
    parts.push(input.previousSummary);
    parts.push('');
  }

  if (input.structuredContext) {
    parts.push('Customer context:');
    parts.push(input.structuredContext);
    parts.push('');
  }

  if (input.bookingSnapshot) {
    parts.push('Booking state:');
    parts.push(input.bookingSnapshot);
    parts.push('');
  }

  if (input.currentIntent) {
    parts.push(`Current intent: ${input.currentIntent}`);
    parts.push('');
  }

  parts.push('Recent messages:');
  for (const msg of input.recentMessages) {
    parts.push(`${msg.role}: ${msg.content}`);
  }
  parts.push('');

  parts.push('Respond ONLY with a JSON object (no markdown, no explanation):');
  parts.push('{');
  parts.push('  "summary_text": "max 120 tokens, factual only",');
  parts.push('  "customer_intent": "booking|reschedule|info|noise|unclear",');
  parts.push('  "facts_collected": ["date:2026-02-20", "duration:120min", ...],');
  parts.push('  "facts_missing": ["time", "level", ...],');
  parts.push('  "constraints": ["prefers morning", ...],');
  parts.push('  "current_stage": "inquiry|gathering_info|ready_to_propose|payment_link|confirmed|completed",');
  parts.push('  "confidence_band": "very_low|low|medium|high|very_high",');
  parts.push('  "next_questions": ["What time works best?", ...],');
  parts.push('  "missing_fields": ["time", "level"]');
  parts.push('}');
  parts.push('');
  parts.push('Rules: only verifiable facts. No invented details. No commitments.');

  return parts.join('\n');
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateSummaryOutput(
  data: SummaryGenerationOutput,
): SummaryOutput | null {
  // Check summaryText length
  if (!data.summaryText || data.summaryText.length === 0) {
    return null;
  }

  const summaryText = data.summaryText.slice(0, MAX_SUMMARY_CHARS);

  // Check summaryJson is serializable and within limits
  let summaryJson: Record<string, unknown>;
  try {
    summaryJson = data.summaryJson as Record<string, unknown>;
    const serialized = JSON.stringify(summaryJson);
    if (serialized.length > MAX_SUMMARY_JSON_CHARS) {
      // Trim arrays to fit
      summaryJson = {
        customer_intent: data.summaryJson.customer_intent,
        facts_collected: data.summaryJson.facts_collected.slice(0, 5),
        facts_missing: data.summaryJson.facts_missing.slice(0, 5),
        constraints: data.summaryJson.constraints.slice(0, 3),
        current_stage: data.summaryJson.current_stage,
      };
    }
  } catch {
    return null;
  }

  return {
    summaryText,
    summaryJson,
    confidenceBand: data.confidenceBand ?? 'medium',
    nextQuestions: (data.nextQuestions ?? []).slice(0, 3),
    missingFields: data.missingFields ?? [],
  };
}
