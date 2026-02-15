/**
 * AI Task Router (Loop A + Loop B)
 *
 * Single entry-point that decides which model to use for each AI task type.
 *
 * Routing policy:
 *   intent_classification  → CHEAP  (gpt-4o-mini / stub)
 *   language_detection     → CHEAP  (gpt-4o-mini / stub)
 *   draft_generation       → STRONG (gpt-4o)
 *
 * Loop B additions:
 *   - Cost estimation per call
 *   - Error categorization (AI_TIMEOUT, AI_PROVIDER_ERROR, AI_PARSE_ERROR, etc.)
 *   - Telemetry callback (onUsage) to persist to ai_usage_events without circular dep
 *
 * Returns structured JSON. Never throws raw LLM errors.
 */

import { classifyRelevanceAndIntent, type RelevanceAndIntentSnapshot } from './relevanceAndIntentClassifier.js';
import { generateAIReply, type GenerateAIReplyOutput } from './ai_reply_stub.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type AiTaskType =
  | 'intent_classification'
  | 'language_detection'
  | 'draft_generation'
  | 'summary_update';

export type AiModelTier = 'cheap' | 'strong';

/** Standardized AI error codes (Loop B, Step 5). */
export type AiErrorCode =
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_PARSE_ERROR'
  | 'AI_RATE_LIMIT'
  | 'AI_UNKNOWN';

export interface AiTaskParams {
  task: AiTaskType;
  /** The raw message text. */
  input: string;
  /** Optional conversation context lines. */
  context?: string[];
  /** Channel hint. */
  channel?: 'whatsapp';
  /** Language hint. */
  language?: string;
  /** Instructor UUID (for telemetry). */
  instructorId?: string | null;
  /** Conversation UUID (for telemetry). */
  conversationId?: string | null;
  /** Request ID (for telemetry correlation). */
  requestId?: string | null;
  /**
   * Loop C: Structured customer context string for draft system prompt.
   * Built by buildCustomerContextPrompt(). Passed through to generateAIReply.
   */
  customerContext?: string | null;
  /**
   * Loop C: Detected language code (e.g. 'it', 'en', 'de', 'fr').
   * Passed through to generateAIReply to set reply language.
   */
  detectedLanguage?: string | null;
  /**
   * Optional telemetry callback. Called after every AI call (success or error).
   * The callback is fire-and-forget: errors are swallowed.
   * Set by the orchestrator layer to persist to ai_usage_events.
   */
  onUsage?: (event: AiUsageEvent) => void;
}

export interface AiTaskResult<T = unknown> {
  /** The structured result payload. */
  data: T;
  /** Which model tier was selected. */
  tier: AiModelTier;
  /** Specific model name used (e.g. 'gpt-4o-mini', 'stub-v1'). */
  model: string;
  /** Input token count (null when using stubs). */
  tokensIn: number | null;
  /** Output token count (null when using stubs). */
  tokensOut: number | null;
  /** Estimated cost in cents (Loop B). */
  costEstimateCents: number;
  /** Error code if the call failed (Loop B). */
  errorCode?: AiErrorCode | null;
}

/** Telemetry event emitted after every AI call (Loop B). */
export interface AiUsageEvent {
  instructorId?: string | null;
  conversationId?: string | null;
  taskType: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEstimateCents: number;
  latencyMs: number;
  timedOut: boolean;
  errorCode?: string | null;
  requestId?: string | null;
}

// ── Cost model ───────────────────────────────────────────────────────────────

/** Per-token pricing (USD). Hardcoded, update periodically. */
const MODEL_COST: Record<string, { in: number; out: number }> = {
  // Cheap tier
  'gpt-4o-mini':   { in: 0.00000015,  out: 0.0000006 },
  'gpt-4.1-mini':  { in: 0.0000004,   out: 0.0000016 },
  'gpt-4.1-nano':  { in: 0.0000001,   out: 0.0000004 },
  // Strong tier
  'gpt-4o':        { in: 0.0000025,    out: 0.00001 },
  'gpt-4.1':       { in: 0.000002,     out: 0.000008 },
  // Stubs & fallbacks — zero cost
  'stub-v1':              { in: 0, out: 0 },
  'lang-heuristic-v1':    { in: 0, out: 0 },
  'timeout-fallback':     { in: 0, out: 0 },
  'error':                { in: 0, out: 0 },
  'none':                 { in: 0, out: 0 },
};

/** Returns cost in USD cents. */
function estimateCostCents(model: string, tokensIn: number, tokensOut: number): number {
  const p = MODEL_COST[model];
  if (!p) return 0;
  return Math.round((tokensIn * p.in + tokensOut * p.out) * 100 * 100) / 100; // round to 0.01 cent
}

// ── Error classification ─────────────────────────────────────────────────────

function classifyError(err: unknown): AiErrorCode {
  if (err == null) return 'AI_UNKNOWN';
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return 'AI_TIMEOUT';
  }
  if (lower.includes('rate') && lower.includes('limit')) {
    return 'AI_RATE_LIMIT';
  }
  if (lower.includes('parse') || lower.includes('json') || lower.includes('unexpected token')) {
    return 'AI_PARSE_ERROR';
  }
  if (lower.includes('api') || lower.includes('openai') || lower.includes('network') || lower.includes('fetch')) {
    return 'AI_PROVIDER_ERROR';
  }
  return 'AI_UNKNOWN';
}

// ── Routing table ────────────────────────────────────────────────────────────

const TASK_TIER: Record<AiTaskType, AiModelTier> = {
  intent_classification: 'cheap',
  language_detection: 'cheap',
  draft_generation: 'strong',
  summary_update: 'cheap',
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Routes an AI task to the correct model and returns structured output.
 *
 * Never throws. On error, wraps and returns a safe error result.
 * Fires onUsage callback after every call (success or error).
 */
export async function runAiTask(params: AiTaskParams): Promise<AiTaskResult> {
  const tier = TASK_TIER[params.task];
  const start = Date.now();
  let result: AiTaskResult;

  try {
    switch (params.task) {
      case 'intent_classification':
        result = await runIntentClassification(params, tier);
        break;

      case 'language_detection':
        result = runLanguageDetection(params, tier);
        break;

      case 'draft_generation':
        result = await runDraftGeneration(params, tier);
        break;

      case 'summary_update':
        result = await runSummaryUpdate(params, tier);
        break;

      default:
        result = {
          data: { error: 'unknown_task', task: params.task },
          tier,
          model: 'none',
          tokensIn: null,
          tokensOut: null,
          costEstimateCents: 0,
          errorCode: null,
        };
    }
  } catch (err) {
    const errorCode = classifyError(err);
    result = {
      data: {
        error: errorCode,
        message: err instanceof Error ? err.message : String(err),
        task: params.task,
      },
      tier,
      model: 'error',
      tokensIn: null,
      tokensOut: null,
      costEstimateCents: 0,
      errorCode,
    };
  }

  // Compute cost
  result.costEstimateCents = estimateCostCents(
    result.model,
    result.tokensIn ?? 0,
    result.tokensOut ?? 0,
  );

  // Fire telemetry callback (fire-and-forget, never block)
  const latencyMs = Date.now() - start;
  if (params.onUsage) {
    try {
      params.onUsage({
        instructorId: params.instructorId ?? null,
        conversationId: params.conversationId ?? null,
        taskType: params.task,
        model: result.model,
        tokensIn: result.tokensIn ?? 0,
        tokensOut: result.tokensOut ?? 0,
        costEstimateCents: result.costEstimateCents,
        latencyMs,
        timedOut: false,
        errorCode: result.errorCode ?? null,
        requestId: params.requestId ?? null,
      });
    } catch { /* onUsage must never throw */ }
  }

  return result;
}

/**
 * Returns the model tier for a given task (useful for timeout selection).
 */
export function getTaskTier(task: AiTaskType): AiModelTier {
  return TASK_TIER[task];
}

// ── Task implementations ─────────────────────────────────────────────────────

async function runIntentClassification(
  params: AiTaskParams,
  tier: AiModelTier,
): Promise<AiTaskResult<RelevanceAndIntentSnapshot>> {
  const snapshot = await classifyRelevanceAndIntent({
    messageText: params.input,
    channel: params.channel ?? 'whatsapp',
    language: params.language,
  });

  return {
    data: snapshot,
    tier,
    model: snapshot.model,
    tokensIn: null,
    tokensOut: null,
    costEstimateCents: 0,
  };
}

function runLanguageDetection(
  params: AiTaskParams,
  tier: AiModelTier,
): AiTaskResult<{ language: string; languageConfidence: number; mixedLanguages: string[] }> {
  const text = params.input.toLowerCase();

  const itSignals = [
    /\b(vorrei|prenot|lezione|giorno|quando|posso|buon|grazie|ciao|disponibil|maestro|sci)\b/,
  ];
  const enSignals = [
    /\b(would|lesson|book|schedule|when|please|thank|available|instructor|ski)\b/,
  ];
  const deSignals = [
    /\b(möchte|stunde|buchen|wann|bitte|danke|verfügbar|skilehrer)\b/,
  ];
  const frSignals = [
    /\b(voudrais|leçon|réserver|quand|s'il\s+vous\s+plaît|merci|bonjour|disponible|moniteur|cours)\b/,
  ];

  const scores: Record<string, number> = { it: 0, en: 0, de: 0, fr: 0 };
  for (const p of itSignals) if (p.test(text)) scores.it += 1;
  for (const p of enSignals) if (p.test(text)) scores.en += 1;
  for (const p of deSignals) if (p.test(text)) scores.de += 1;
  for (const p of frSignals) if (p.test(text)) scores.fr += 1;

  const total = scores.it + scores.en + scores.de;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0];

  const mixedLanguages = sorted.filter(([, s]) => s > 0).map(([lang]) => lang);

  const confidence = total > 0
    ? Math.min(0.95, primary[1] / Math.max(total, 1))
    : 0.3;

  const language = total > 0 ? primary[0] : (params.language ?? 'it');

  return {
    data: { language, languageConfidence: confidence, mixedLanguages: mixedLanguages.length > 1 ? mixedLanguages : [] },
    tier,
    model: 'lang-heuristic-v1',
    tokensIn: null,
    tokensOut: null,
    costEstimateCents: 0,
  };
}

async function runDraftGeneration(
  params: AiTaskParams,
  tier: AiModelTier,
): Promise<AiTaskResult<GenerateAIReplyOutput>> {
  const reply = await generateAIReply({
    lastMessageText: params.input,
    language: params.language,
    conversationHistory: params.context?.map((c) => ({ role: 'user' as const, content: c })),
    // Loop C: customer context + language for improved suggestions
    customerContext: params.customerContext ?? null,
    detectedLanguage: params.detectedLanguage ?? null,
  });

  return {
    data: reply,
    tier,
    model: reply.model ?? 'gpt-4o-mini',
    tokensIn: null,   // Phase 2: extract from OpenAI response usage field
    tokensOut: null,
    costEstimateCents: 0,
  };
}

// ── Summary generation types ─────────────────────────────────────────────────

export interface SummaryGenerationOutput {
  summaryText: string;
  summaryJson: {
    customer_intent: string;
    facts_collected: string[];
    facts_missing: string[];
    constraints: string[];
    current_stage: string;
  };
  confidenceBand: string;
  nextQuestions: string[];
  missingFields: string[];
}

/**
 * Generates a rolling conversation summary using the cheap model.
 * Structured output via system prompt instructions.
 * Fail-open: returns null if LLM call fails.
 */
async function runSummaryUpdate(
  params: AiTaskParams,
  tier: AiModelTier,
): Promise<AiTaskResult<SummaryGenerationOutput | null>> {
  // Build the summary prompt from context lines
  const summaryPrompt = params.context?.join('\n') ?? params.input;

  const reply = await generateAIReply({
    lastMessageText: summaryPrompt,
    language: params.language,
  });

  // Parse structured output from the LLM reply
  const parsed = parseSummaryOutput(reply.replyText);

  return {
    data: parsed,
    tier,
    model: reply.model ?? 'gpt-4o-mini',
    tokensIn: null,
    tokensOut: null,
    costEstimateCents: 0,
  };
}

/**
 * Attempts to parse structured JSON from the LLM summary reply.
 * Falls back to treating the entire reply as summary_text.
 */
function parseSummaryOutput(text: string): SummaryGenerationOutput | null {
  if (!text || text.trim().length === 0) return null;

  // Try to extract JSON block from the reply
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
      return {
        summaryText: String(raw.summary_text ?? raw.summaryText ?? text).slice(0, 500),
        summaryJson: {
          customer_intent: String(raw.customer_intent ?? raw.summaryJson?.customer_intent ?? 'unclear'),
          facts_collected: Array.isArray(raw.facts_collected ?? raw.summaryJson?.facts_collected)
            ? (raw.facts_collected ?? raw.summaryJson?.facts_collected) : [],
          facts_missing: Array.isArray(raw.facts_missing ?? raw.summaryJson?.facts_missing)
            ? (raw.facts_missing ?? raw.summaryJson?.facts_missing) : [],
          constraints: Array.isArray(raw.constraints ?? raw.summaryJson?.constraints)
            ? (raw.constraints ?? raw.summaryJson?.constraints) : [],
          current_stage: String(raw.current_stage ?? raw.summaryJson?.current_stage ?? 'inquiry'),
        },
        confidenceBand: String(raw.confidence_band ?? raw.confidenceBand ?? 'medium'),
        nextQuestions: Array.isArray(raw.next_questions ?? raw.nextQuestions)
          ? (raw.next_questions ?? raw.nextQuestions).slice(0, 3) : [],
        missingFields: Array.isArray(raw.missing_fields ?? raw.missingFields)
          ? (raw.missing_fields ?? raw.missingFields) : [],
      };
    } catch {
      // JSON parse failed — fall through to text fallback
    }
  }

  // Fallback: use entire reply as summary text
  return {
    summaryText: text.slice(0, 500),
    summaryJson: {
      customer_intent: 'unclear',
      facts_collected: [],
      facts_missing: [],
      constraints: [],
      current_stage: 'inquiry',
    },
    confidenceBand: 'low',
    nextQuestions: [],
    missingFields: [],
  };
}
