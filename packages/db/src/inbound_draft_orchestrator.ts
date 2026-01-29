import { sql } from './client.js';
import { classifyRelevanceAndIntent } from '@frostdesk/ai/src/relevanceAndIntentClassifier.js';
import { decideByConfidence } from '@frostdesk/ai/src/confidenceDecisionEngine.js';
import { escalationGate } from '@frostdesk/ai/src/escalationGate.js';
import { generateAIReply } from '@frostdesk/ai/src/ai_reply_stub.js';
import { sanitizeDraftText } from '@frostdesk/ai/src/draftQualityGuardrails.js';
import { insertAISnapshot, findAISnapshotByMessageId } from './ai_snapshot_repository.js';
import { insertDraftOnce, findDraftByMessageId } from './ai_draft_repository.js';

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
 * Inbound Draft Orchestrator (PILOT-SAFE)
 * 
 * Orchestrates AI classification, decision, and optional draft generation
 * for inbound WhatsApp messages.
 * 
 * WHAT THIS DOES:
 * - Classifies relevance and intent
 * - Applies confidence policy
 * - Persists audit snapshot
 * - Generates draft only if policy allows (allowDraft=true)
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
}

export interface InboundDraftOrchestratorResult {
  snapshotId: string;
  draftGenerated: boolean;
  decision: string;
  reason: string;
  allowDraft: boolean;
  requireEscalation: boolean;
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
  const { conversationId, externalMessageId, messageText, channel, language } = params;

  // Step 1: Find message_id from messages table
  const messageId = await findMessageIdByExternalId(conversationId, externalMessageId);
  if (!messageId) {
    // Message not found in messages table, cannot create snapshot
    throw new Error(`Message not found for conversation ${conversationId} and external_id ${externalMessageId}`);
  }

  // Step 2: Check idempotency (if snapshot already exists, return early)
  const existingSnapshot = await findAISnapshotByMessageId(messageId);
  if (existingSnapshot) {
    // Check if draft exists for this message_id
    const existingDraft = await findDraftByMessageId(messageId);
    return {
      snapshotId: existingSnapshot.id,
      draftGenerated: existingDraft !== null,
      decision: existingSnapshot.decision || 'UNKNOWN',
      reason: existingSnapshot.reason || 'UNKNOWN',
      allowDraft: existingSnapshot.allow_draft === true,
      requireEscalation: existingSnapshot.require_escalation === true,
    };
  }

  // Step 3: Classify relevance and intent
  const classification = await classifyRelevanceAndIntent({
    messageText,
    channel,
    language,
  });

  // Step 4: Apply confidence policy
  const decision = decideByConfidence({
    relevanceConfidence: classification.relevanceConfidence,
    intentConfidence: classification.intentConfidence || 0,
  });

  // Step 5: Get escalation gate permissions
  const gate = escalationGate({
    decision: decision.decision,
    reason: decision.reason,
  });

  // Step 6: Persist AI snapshot
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
    decision: decision.decision,
    reason: decision.reason,
    allow_draft: gate.allowDraft,
    require_escalation: gate.requireEscalation,
  });

  // Step 7: Generate draft only if allowed
  let draftGenerated = false;
  if (gate.allowDraft) {
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
      } else {
        // Guardrails failed: do not save draft
        // Log violations for observability
        console.warn('[INBOUND DRAFT ORCHESTRATOR] Draft quality guardrails failed:', qualityCheck.violations);
        // draftGenerated remains false
      }
    } catch (error) {
      // Draft generation failed, but snapshot is already saved
      // Log error but don't fail the entire orchestration
      console.error('[INBOUND DRAFT ORCHESTRATOR] Draft generation failed:', error);
    }
  }

  return {
    snapshotId,
    draftGenerated,
    decision: decision.decision,
    reason: decision.reason,
    allowDraft: gate.allowDraft,
    requireEscalation: gate.requireEscalation,
  };
}
