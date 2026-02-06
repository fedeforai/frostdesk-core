import { sql } from './client.js';
import {
  classifyRelevanceAndIntent,
  decideBooking,
  decideByConfidence,
  escalationGate,
  generateAIReply,
  sanitizeDraftText,
} from '@frostdesk/ai';
import { insertAISnapshot, findAISnapshotByMessageId } from './ai_snapshot_repository.js';
import { insertDraftOnce, findDraftByMessageId } from './ai_draft_repository.js';
import { insertAuditEvent } from './audit_log_repository.js';

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
    const existingDraft = await findDraftByMessageId(messageId);
    return {
      snapshotId: existingSnapshot.id,
      draftGenerated: existingDraft !== null,
    };
  }

  // Step 3: Classify relevance and intent
  const classification = await classifyRelevanceAndIntent({
    messageText,
    channel,
    language,
  });

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

  switch (bookingDecision.action) {
    case 'ignore': {
      const snapshotId = await insertAISnapshot({
        message_id: messageId,
        conversation_id: conversationId,
        channel,
        relevant: classification.relevant,
        relevance_confidence: classification.relevanceConfidence,
        relevance_reason: classification.relevanceReason || null,
        intent: classification.intent || null,
        intent_confidence: classification.intentConfidence || null,
        model: classification.model,
      });
      return { snapshotId, draftGenerated: false };
    }
    case 'escalate': {
      const snapshotId = await insertAISnapshot({
        message_id: messageId,
        conversation_id: conversationId,
        channel,
        relevant: classification.relevant,
        relevance_confidence: classification.relevanceConfidence,
        relevance_reason: classification.relevanceReason || null,
        intent: classification.intent || null,
        intent_confidence: classification.intentConfidence || null,
        model: classification.model,
      });
      return { snapshotId, draftGenerated: false };
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
  const snapshotId = await insertAISnapshot({
    message_id: messageId,
    conversation_id: conversationId,
    channel,
    relevant: classification.relevant,
    relevance_confidence: classification.relevanceConfidence,
    relevance_reason: classification.relevanceReason || null,
    intent: classification.intent || null,
    intent_confidence: classification.intentConfidence || null,
    model: classification.model,
  });

  // Step 7: Generate draft only if allowed, intent is operative, and confidence ≥ threshold
  let draftGenerated = false;
  let skipReason: string | null = null;
  const intentOperative = classification.intent && OPERATIVE_INTENTS.includes(classification.intent as any);
  const confidenceOk = (classification.intentConfidence ?? 0) >= DRAFT_MIN_CONFIDENCE;

  if (!gate.allowDraft) skipReason = 'gate_denied';
  else if (!intentOperative) skipReason = 'intent_non_operative';
  else if (!confidenceOk) skipReason = 'confidence_low';

  if (gate.allowDraft && intentOperative && confidenceOk) {
    try {
      const draft = generateAIReply({
        lastMessageText: messageText,
        language,
      });

      // Apply quality guardrails
      const qualityCheck = sanitizeDraftText({
        rawDraftText: draft.replyText,
        intent: classification.intent || null,
        language,
      });

      if (qualityCheck.safeDraftText) {
        await insertDraftOnce({
          message_id: messageId,
          snapshot_id: snapshotId,
          text: qualityCheck.safeDraftText,
          model: 'stub-v1',
          created_at: new Date().toISOString(),
        });

        draftGenerated = true;

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
              model: process.env.AI_MODEL ?? 'unknown',
              confidence_intent: classification.intentConfidence ?? null,
              was_truncated: qualityCheck.was_truncated,
              violations_count: qualityCheck.violations_count,
            },
          });
        } catch {
          // Fail-open: do not block draft flow
        }
      } else {
        // Guardrails failed: do not save draft
        skipReason = 'quality_blocked';
        console.warn('[INBOUND DRAFT ORCHESTRATOR] Draft quality guardrails failed:', qualityCheck.violations);
      }
    } catch (error) {
      skipReason = 'error';
      console.error('[INBOUND DRAFT ORCHESTRATOR] Draft generation failed:', error);
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
        payload: { reason: skipReason },
      });
    } catch {
      // Fail-open: audit best-effort only
    }
  }

  return { snapshotId, draftGenerated };
}
