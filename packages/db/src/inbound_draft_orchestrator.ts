import { sql } from './client.js';
import {
  decideBooking,
  decideByConfidence,
  escalationGate,
  sanitizeDraftText,
  // Loop A: routed AI calls + confidence band + timeout
  runAiTask,
  withTimeout,
  AI_TIMEOUT,
  mapConfidenceToBand,
  // Loop C: customer context prompt builder
  buildCustomerContextPrompt,
} from '@frostdesk/ai';
import type { RelevanceAndIntentSnapshot, GenerateAIReplyOutput, ConfidenceBand, AiUsageEvent } from '@frostdesk/ai';
import { extractBookingFields } from './booking_field_extractor.js';
import { insertAISnapshot, findAISnapshotByMessageId } from './ai_snapshot_repository.js';
import { insertDraftOnce, findDraftByMessageId } from './ai_draft_repository.js';
import { upsertProposedDraft } from './instructor_draft_repository.js';
import { insertAuditEvent } from './audit_log_repository.js';
import { insertAIBookingDraft } from './ai_booking_draft_repository_v2.js';
// Loop B: telemetry persistence
import { insertAiUsageEvent } from './ai_usage_repository.js';
// Loop C: customer booking context (read-only suggestion memory)
import { getLastCompletedBookingContext } from './customer_booking_context.js';
import { getConversationCustomerId } from './conversation_customer_link.js';
// Rolling summary (token control)
import { getConversationSummary, getMessageCountSinceLastSummary, getRecentMessagesForSummary, updateConversationSummary } from './conversation_summary_repository.js';
import { shouldUpdateSummary, estimateTokens } from './summary_policy.js';
import { generateSummary } from './summary_generator.js';

/**
 * Helper: Resolves instructor_id from a conversation row.
 */
async function getConversationInstructorId(
  conversationId: string
): Promise<string | null> {
  const rows = await sql<Array<{ instructor_id: string }>>`
    SELECT instructor_id::text FROM conversations WHERE id = ${conversationId}::uuid LIMIT 1
  `;
  return rows.length > 0 ? rows[0].instructor_id : null;
}

/**
 * Helper: Finds message_id from messages table by conversation_id and external_message_id.
 */
async function findMessageIdByExternalId(
  conversationId: string,
  externalMessageId: string
): Promise<string | null> {
  const result = await sql<Array<{ id: string }>>`
    SELECT id
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND external_message_id = ${externalMessageId}
      AND direction = 'inbound'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.length > 0 ? result[0].id : null;
}

/**
 * Helper: Resolves customer_identifier (phone) from a conversation.
 */
async function getConversationCustomerIdentifier(
  conversationId: string
): Promise<string | null> {
  const rows = await sql<Array<{ customer_identifier: string }>>`
    SELECT customer_identifier FROM conversations WHERE id = ${conversationId}::uuid LIMIT 1
  `;
  return rows.length > 0 ? rows[0].customer_identifier : null;
}

/**
 * Generate a customer-facing "booking received" reply.
 */
function generateBookingReceivedReply(language?: string): string {
  if (language === 'it') {
    return (
      'Grazie! Ho ricevuto la tua richiesta di prenotazione con tutti i dettagli. ' +
      'Sto verificando la disponibilità e ti invierò la conferma definitiva il prima possibile. ' +
      'A presto!'
    );
  }
  return (
    'Thank you! I\'ve received your booking request with all the details. ' +
    'I\'m checking availability and will send you the final confirmation as soon as possible. ' +
    'Talk soon!'
  );
}

/**
 * Intents for which we allow draft generation (operative only).
 * No draft for CANCEL or other intents — reduces noise and increases trust.
 */
const OPERATIVE_INTENTS = ['NEW_BOOKING', 'RESCHEDULE', 'INFO_REQUEST'] as const;
const DRAFT_MIN_CONFIDENCE = 0.6;

/**
 * Inbound Draft Orchestrator (PILOT-SAFE)
 * 
 * Orchestrates AI classification, decision, and optional draft generation
 * for inbound WhatsApp messages.
 * 
 * WHAT THIS DOES:
 * - Classifies relevance and intent
 * - Applies confidence policy
 * - Persists audit snapshot
 * - Generates draft only if policy allows (allowDraft=true), intent is operative, and confidence ≥ threshold
 * 
 * WHAT THIS DOES NOT DO:
 * - No outbound messaging
 * - No booking creation
 * - No autonomous actions
 * - No side effects beyond snapshot + optional draft
 */

export interface InboundDraftOrchestratorParams {
  conversationId: string; // UUID from conversations table
  externalMessageId: string; // External message ID (e.g., WhatsApp message ID)
  messageText: string;
  channel: 'whatsapp';
  language?: string;
  /** Optional request id for audit correlation (from API layer). */
  requestId?: string | null;
}

export interface InboundDraftOrchestratorResult {
  snapshotId: string;
  draftGenerated: boolean;
  /** If a structured booking draft was created, its ID. */
  bookingDraftId?: string | null;
  /** If a structured booking draft was created, the customer-facing reply. */
  bookingDraftReply?: string | null;
  // Loop A: telemetry
  /** Confidence band (A_CERTAIN..E_UNKNOWN) computed from intent confidence. */
  confidenceBand?: ConfidenceBand;
  /** True if the classification call timed out. */
  timedOut?: boolean;
  /** Wall-clock ms for the classification step. */
  classificationElapsedMs?: number;
  // Loop C: suggestion context enrichment
  /** Detected language code (e.g. 'it', 'en', 'de', 'fr'). */
  detectedLanguage?: string | null;
  /** True if customer booking history was injected into the draft prompt. */
  customerContextUsed?: boolean;
  // Rolling summary
  /** True if an existing summary was used in the draft prompt. */
  summaryUsed?: boolean;
  /** True if the summary was regenerated during this invocation. */
  summaryUpdated?: boolean;
}

/**
 * Orchestrates AI classification and draft generation for inbound message.
 * 
 * Process:
 * 1. Check if snapshot already exists (idempotency)
 * 2. Classify relevance + intent
 * 3. Apply confidence policy
 * 4. Persist snapshot
 * 5. If allowDraft=true, generate and store draft
 * 
 * Idempotent: if snapshot exists for message_id, returns existing data.
 * 
 * @param params - Inbound message parameters
 * @returns Orchestration result with snapshot and draft status
 */
export async function orchestrateInboundDraft(
  params: InboundDraftOrchestratorParams
): Promise<InboundDraftOrchestratorResult> {
  const { conversationId, externalMessageId, messageText, channel, language, requestId } = params;

  // Step 1: Find message_id from messages table
  const messageId = await findMessageIdByExternalId(conversationId, externalMessageId);
  if (!messageId) {
    // Message not found in messages table, cannot create snapshot
    throw new Error(`Message not found for conversation ${conversationId} and external_id ${externalMessageId}`);
  }

  // Step 2: Check idempotency (if snapshot already exists, return early)
  const existingSnapshot = await findAISnapshotByMessageId(messageId);
  if (existingSnapshot) {
    // Try legacy message_metadata; fail-open if table doesn't exist
    let existingDraft: unknown = null;
    try {
      existingDraft = await findDraftByMessageId(messageId);
    } catch {
      // message_metadata table may not exist — check ai_drafts instead
      const aiDraftRows = await sql<Array<{ id: string }>>`
        SELECT id FROM ai_drafts
        WHERE conversation_id = ${conversationId}::uuid AND state = 'proposed'
        LIMIT 1
      `;
      existingDraft = aiDraftRows.length > 0 ? aiDraftRows[0] : null;
    }
    return {
      snapshotId: existingSnapshot.id,
      draftGenerated: existingDraft !== null,
    };
  }

  // Loop B: resolve instructor early for telemetry context
  let resolvedInstructorId: string | null = null;
  try {
    resolvedInstructorId = await getConversationInstructorId(conversationId);
  } catch { /* fail-open */ }

  // Loop B: telemetry callback — persists to ai_usage_events (fire-and-forget)
  // Feature flag: ENABLE_AI_USAGE_TELEMETRY (default ON, set to '0' to disable)
  const telemetryEnabled = process.env.ENABLE_AI_USAGE_TELEMETRY !== '0';
  const onUsage = (event: AiUsageEvent): void => {
    if (!telemetryEnabled) return;
    insertAiUsageEvent({
      instructorId: event.instructorId,
      conversationId: event.conversationId,
      taskType: event.taskType,
      model: event.model,
      tokensIn: event.tokensIn,
      tokensOut: event.tokensOut,
      costEstimateCents: event.costEstimateCents,
      latencyMs: event.latencyMs,
      timedOut: event.timedOut,
      errorCode: event.errorCode,
      requestId: event.requestId,
    }).catch(() => { /* telemetry is best-effort */ });
  };

  // ── Step 3: Classify relevance + intent via AI Router + Timeout ────────
  const classificationTask = runAiTask({
    task: 'intent_classification',
    input: messageText,
    channel,
    language,
    instructorId: resolvedInstructorId,
    conversationId,
    requestId,
    onUsage,
  });
  const classificationResult = await withTimeout(classificationTask, AI_TIMEOUT.INTENT);

  let classification: RelevanceAndIntentSnapshot;
  let classificationTimedOut = false;
  let classificationModel = 'stub-v1';
  const classificationElapsedMs = classificationResult.elapsedMs;

  if (classificationResult.timedOut || !classificationResult.result) {
    // Timeout fallback: treat as unknown intent, low confidence → escalate
    classificationTimedOut = true;
    classification = {
      relevant: true,        // assume relevant so it gets escalated, not dropped
      relevanceConfidence: 0,
      intent: undefined,
      intentConfidence: 0,
      model: 'timeout-fallback',
    };
    classificationModel = 'timeout-fallback';
  } else {
    classification = classificationResult.result.data as RelevanceAndIntentSnapshot;
    classificationModel = classificationResult.result.model;
  }

  // Compute confidence band from intent confidence
  const confidenceBand = mapConfidenceToBand(classification.intentConfidence ?? 0);

  // BookingDecision v1 gate (frozen): map to 'booking' | 'info' for decideBooking
  const intentForBooking: 'booking' | 'info' =
    classification.intent === 'NEW_BOOKING' || classification.intent === 'RESCHEDULE'
      ? 'booking'
      : 'info';
  const bookingDecision = decideBooking({
    relevance: classification.relevant,
    relevanceConfidence: classification.relevanceConfidence,
    intent: intentForBooking,
    intentConfidence: classification.intentConfidence ?? 0,
  });

  /** Shared snapshot params — avoids repetition across switch branches. */
  const snapshotParams = {
    message_id: messageId,
    conversation_id: conversationId,
    channel,
    relevant: classification.relevant,
    relevance_confidence: classification.relevanceConfidence,
    relevance_reason: classification.relevanceReason || null,
    intent: classification.intent || null,
    intent_confidence: classification.intentConfidence || null,
    model: classificationModel,
    // Loop A: in-memory enrichment (not persisted to DB column)
    confidence_band: confidenceBand,
    timed_out: classificationTimedOut,
  } as const;

  switch (bookingDecision.action) {
    case 'ignore': {
      const snapshotId = await insertAISnapshot(snapshotParams);
      // Audit: log classification telemetry
      try {
        await insertAuditEvent({
          actor_type: 'system',
          actor_id: null,
          action: 'ai_classification',
          entity_type: 'conversation',
          entity_id: conversationId,
          severity: 'info',
          request_id: requestId ?? null,
          payload: {
            decision: 'ignore',
            confidence_band: confidenceBand,
            timed_out: classificationTimedOut,
            classification_ms: classificationElapsedMs,
            model: classificationModel,
          },
        });
      } catch { /* fail-open */ }
      return { snapshotId, draftGenerated: false, confidenceBand, timedOut: classificationTimedOut, classificationElapsedMs };
    }
    case 'escalate': {
      const snapshotId = await insertAISnapshot(snapshotParams);
      try {
        await insertAuditEvent({
          actor_type: 'system',
          actor_id: null,
          action: 'ai_classification',
          entity_type: 'conversation',
          entity_id: conversationId,
          severity: 'info',
          request_id: requestId ?? null,
          payload: {
            decision: 'escalate',
            confidence_band: confidenceBand,
            timed_out: classificationTimedOut,
            classification_ms: classificationElapsedMs,
            model: classificationModel,
          },
        });
      } catch { /* fail-open */ }
      return { snapshotId, draftGenerated: false, confidenceBand, timedOut: classificationTimedOut, classificationElapsedMs };
    }
    case 'ai_reply':
      break;
  }

  // Step 4: Apply confidence policy (ai_reply path only)
  const decision = decideByConfidence({
    relevanceConfidence: classification.relevanceConfidence,
    intentConfidence: classification.intentConfidence || 0,
  });

  // Step 5: Get escalation gate permissions
  const gate = escalationGate({
    decision: decision.decision,
    reason: decision.reason,
  });

  // Step 6: Persist AI snapshot (classification only; no decision fields)
  const snapshotId = await insertAISnapshot(snapshotParams);

  // Step 7: Generate draft only if allowed, intent is operative, and confidence ≥ threshold
  let draftGenerated = false;
  let bookingDraftId: string | null = null;
  let bookingDraftReply: string | null = null;
  let skipReason: string | null = null;
  const intentOperative = classification.intent && OPERATIVE_INTENTS.includes(classification.intent as any);
  const confidenceOk = (classification.intentConfidence ?? 0) >= DRAFT_MIN_CONFIDENCE;

  // ── Loop C: Language detection (cheap, heuristic) ──────────────────────
  let detectedLanguage: string | null = language ?? null;
  try {
    const langTask = runAiTask({
      task: 'language_detection',
      input: messageText,
      language,
      instructorId: resolvedInstructorId,
      conversationId,
      requestId,
      onUsage,
    });
    // Language detection is synchronous (heuristic), but wrap for uniformity
    const langResult = await langTask;
    const langData = langResult.data as { language: string; languageConfidence: number; mixedLanguages: string[] };
    if (langData.languageConfidence >= 0.5) {
      detectedLanguage = langData.language;
    }
  } catch { /* fail-open: keep original language hint */ }

  // ── Loop C: Customer booking context (read-only suggestion memory) ─────
  let customerContextPrompt: string | null = null;
  let customerContextUsed = false;
  try {
    const customerId = await getConversationCustomerId(conversationId);
    if (customerId && resolvedInstructorId) {
      const ctx = await getLastCompletedBookingContext(resolvedInstructorId, customerId);
      customerContextPrompt = buildCustomerContextPrompt(ctx);
      customerContextUsed = customerContextPrompt !== null;
    }
  } catch { /* fail-open: customer context is never critical */ }

  // ── Rolling Summary: evaluate trigger policy, regenerate if needed ─────
  // Feature flag: ENABLE_AI_SUMMARY (default ON, set to '0' to disable)
  const summaryEnabled = process.env.ENABLE_AI_SUMMARY !== '0';
  let existingSummaryText: string | null = null;
  let summaryUpdated = false;
  if (summaryEnabled) try {
    const existingSummary = await getConversationSummary(conversationId);
    existingSummaryText = existingSummary?.aiSummary ?? null;

    const msgCountSinceLast = await getMessageCountSinceLastSummary(conversationId);
    const recentMsgsForEstimate = await getRecentMessagesForSummary(conversationId, 8);
    const tokenEstimate = estimateTokens(recentMsgsForEstimate.map((m) => m.content));

    // Detect intent change: compare current intent to previous summary JSON
    let intentChanged = false;
    if (existingSummary?.aiSummaryJson && classification.intent) {
      const prevIntent = (existingSummary.aiSummaryJson as Record<string, unknown>).customer_intent;
      const currIntentNorm = classification.intent === 'NEW_BOOKING' ? 'booking'
        : classification.intent === 'RESCHEDULE' ? 'reschedule'
        : classification.intent === 'CANCEL' ? 'cancel'
        : classification.intent === 'INFO_REQUEST' ? 'info' : 'unclear';
      intentChanged = prevIntent != null && prevIntent !== currIntentNorm;
    }

    const policy = shouldUpdateSummary({
      messageCountSinceLast: msgCountSinceLast,
      intentChanged,
      bookingStateChanged: false, // no booking state change in this path
      estimatedTokens: tokenEstimate,
    });

    if (policy.shouldUpdate) {
      const summaryResult = await generateSummary({
        previousSummary: existingSummaryText,
        recentMessages: recentMsgsForEstimate,
        structuredContext: customerContextPrompt,
        bookingSnapshot: null,
        currentIntent: classification.intent ?? null,
        instructorId: resolvedInstructorId,
        conversationId,
        requestId,
        onUsage,
      });

      if (summaryResult) {
        const newVersion = await updateConversationSummary({
          conversationId,
          summaryText: summaryResult.summaryText,
          summaryJson: summaryResult.summaryJson,
          messageId,
        });
        if (newVersion != null) {
          existingSummaryText = summaryResult.summaryText;
          summaryUpdated = true;
        }

        // Audit: summary update
        try {
          await insertAuditEvent({
            actor_type: 'system',
            actor_id: null,
            action: 'conversation_ai_summary_updated',
            entity_type: 'conversation',
            entity_id: conversationId,
            severity: 'info',
            request_id: requestId ?? null,
            payload: {
              trigger_reason: policy.reason,
              mode: existingSummaryText ? 'incremental_merge' : 'bootstrap',
              version: newVersion,
              summary_chars: summaryResult.summaryText.length,
              confidence_band: summaryResult.confidenceBand,
              missing_fields: summaryResult.missingFields,
            },
          });
        } catch { /* fail-open */ }
      }
    }
  } catch { /* fail-open: summary is never critical */ }

  if (!gate.allowDraft) skipReason = 'gate_denied';
  else if (!intentOperative) skipReason = 'intent_non_operative';
  else if (!confidenceOk) skipReason = 'confidence_low';

  if (gate.allowDraft && intentOperative && confidenceOk) {
    try {
      const instructorId = resolvedInstructorId ?? await getConversationInstructorId(conversationId);

      // ── NEW: Booking field extraction for NEW_BOOKING intent ──────────
      // If the message contains ALL required booking fields, create a structured
      // booking draft (ai_booking_drafts) and generate a "booking received" reply
      // instead of the generic AI text suggestion.
      if (
        instructorId &&
        (classification.intent === 'NEW_BOOKING' || classification.intent === 'RESCHEDULE')
      ) {
        const extraction = extractBookingFields(messageText);

        if (extraction.complete) {
          // All required fields present → create structured booking draft
          const customerPhone = await getConversationCustomerIdentifier(conversationId);
          const customerReply = generateBookingReceivedReply(language);

          try {
            const bookingDraft = await insertAIBookingDraft({
              conversationId,
              instructorId,
              messageId,
              customerName: extraction.fields.customerName,
              customerPhone,
              bookingDate: extraction.fields.date!,
              startTime: extraction.fields.startTime!,
              endTime: extraction.fields.endTime!,
              durationMinutes: extraction.fields.durationMinutes,
              partySize: extraction.fields.partySize ?? 1,
              skillLevel: extraction.fields.skillLevel,
              lessonType: extraction.fields.lessonType,
              sport: extraction.fields.sport,
              resort: extraction.fields.resort,
              meetingPointText: extraction.fields.meetingPointText,
              rawExtraction: JSON.parse(JSON.stringify(extraction.fields)) as Record<string, unknown>,
              extractionConfidence: extraction.extractionConfidence,
              draftReason: `AI auto-extracted ${Object.values(extraction.fields).filter((v) => v !== null).length} fields from customer message`,
              aiCustomerReply: customerReply,
            });

            bookingDraftId = bookingDraft.id;
            bookingDraftReply = customerReply;

            // Also write the customer reply as the Inbox AI draft (so instructor sees it)
            await upsertProposedDraft({
              conversationId,
              instructorId,
              draftText: customerReply,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
            });
            draftGenerated = true;

            try {
              await insertAuditEvent({
                actor_type: 'system',
                actor_id: null,
                action: 'ai_booking_draft_created',
                entity_type: 'conversation',
                entity_id: conversationId,
                severity: 'info',
                request_id: requestId ?? null,
                payload: {
                  booking_draft_id: bookingDraft.id,
                  extraction_confidence: extraction.extractionConfidence,
                  fields_extracted: Object.entries(extraction.fields)
                    .filter(([, v]) => v !== null)
                    .map(([k]) => k),
                  missing_fields: extraction.missingFields,
                },
              });
            } catch {
              // Fail-open: audit best-effort
            }
          } catch {
            // Booking draft insert failed — fall through to generic text draft below
          }
        }
      }

      // ── Generic text draft (fallback if no booking draft was created) ──
      if (!draftGenerated) {
        // Build enriched context: summary (if available) + customer memory
        let enrichedContext = customerContextPrompt ?? '';
        if (existingSummaryText) {
          enrichedContext = `Conversation summary (compact, factual):\n${existingSummaryText}\n\n${enrichedContext}`;
        }

        // Route through AI Router + Timeout
        // Loop C + Summary: pass enriched context for improved suggestions
        const draftTask = runAiTask({
          task: 'draft_generation',
          input: messageText,
          language: detectedLanguage ?? language,
          instructorId: resolvedInstructorId,
          conversationId,
          requestId,
          customerContext: enrichedContext.trim() || null,
          detectedLanguage,
          onUsage,
        });
        const draftResult = await withTimeout(draftTask, AI_TIMEOUT.DRAFT);

        let draftReplyText: string;
        let draftModel = 'unknown';

        if (draftResult.timedOut || !draftResult.result) {
          // Draft timed out → skip, don't block
          skipReason = 'draft_timeout';
          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: null,
              action: 'ai_draft_timeout',
              entity_type: 'conversation',
              entity_id: conversationId,
              severity: 'warn',
              request_id: requestId ?? null,
              payload: { elapsed_ms: draftResult.elapsedMs },
            });
          } catch { /* fail-open */ }
        }

        if (!draftResult.timedOut && draftResult.result) {
          const draftData = draftResult.result.data as GenerateAIReplyOutput;
          draftReplyText = draftData.replyText;
          draftModel = draftResult.result.model;
        } else {
          draftReplyText = '';
        }

        // Apply quality guardrails (only if we have text)
        const qualityCheck = draftReplyText
          ? sanitizeDraftText({
              rawDraftText: draftReplyText,
              intent: classification.intent || null,
              language,
            })
          : { safeDraftText: null, violations: [], was_truncated: false, violations_count: 0 };

        if (qualityCheck.safeDraftText) {
          // PRIMARY: write to ai_drafts (Instructor Inbox UI reads from here)
          if (instructorId) {
            await upsertProposedDraft({
              conversationId,
              instructorId,
              draftText: qualityCheck.safeDraftText,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
            });
            draftGenerated = true;
          }

          // LEGACY: also write to message_metadata (fail-open; table may not exist)
          try {
            await insertDraftOnce({
              message_id: messageId,
              snapshot_id: snapshotId,
              text: qualityCheck.safeDraftText,
              model: 'stub-v1',
              created_at: new Date().toISOString(),
            });
          } catch {
            // message_metadata table may not exist — non-fatal
          }

          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: null,
              action: 'ai_draft_generated',
              entity_type: 'conversation',
              entity_id: conversationId,
              severity: 'info',
              request_id: requestId ?? null,
              payload: {
                draft_id: messageId,
                model: draftModel,
                confidence_intent: classification.intentConfidence ?? null,
                confidence_band: confidenceBand,
                timed_out: classificationTimedOut,
                classification_ms: classificationElapsedMs,
                draft_ms: draftResult.elapsedMs,
                was_truncated: qualityCheck.was_truncated,
                violations_count: qualityCheck.violations_count,
                // Loop C: context enrichment telemetry
                detected_language: detectedLanguage,
                customer_context_used: customerContextUsed,
                // Rolling summary
                summary_used: existingSummaryText !== null,
                summary_updated: summaryUpdated,
              },
            });
          } catch {
            // Fail-open: do not block draft flow
          }
        } else {
          // Guardrails failed: do not save draft
          skipReason = 'quality_blocked';
        }
      }
    } catch {
      skipReason = 'error';
    }
  }

  if (!draftGenerated && skipReason !== null) {
    try {
      await insertAuditEvent({
        actor_type: 'system',
        actor_id: null,
        action: 'ai_draft_skipped',
        entity_type: 'conversation',
        entity_id: conversationId,
        severity: 'info',
        request_id: requestId ?? null,
        payload: {
          reason: skipReason,
          confidence_band: confidenceBand,
          timed_out: classificationTimedOut,
          classification_ms: classificationElapsedMs,
        },
      });
    } catch {
      // Fail-open: audit best-effort only
    }
  }

  return {
    snapshotId,
    draftGenerated,
    bookingDraftId,
    bookingDraftReply,
    confidenceBand,
    timedOut: classificationTimedOut,
    classificationElapsedMs,
    // Loop C: context enrichment
    detectedLanguage,
    customerContextUsed,
    // Rolling summary
    summaryUsed: existingSummaryText !== null,
    summaryUpdated,
  };
}
