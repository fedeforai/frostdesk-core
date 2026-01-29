/**
 * Relevance and Intent Classifier Orchestrator (PILOT-SAFE)
 * 
 * Orchestrates relevance classification and intent classification
 * to produce a complete AI snapshot.
 * 
 * WHAT IT DOES:
 * - First classifies relevance
 * - If relevant, classifies intent
 * - Returns complete snapshot ready for persistence
 * 
 * WHAT IT DOES NOT DO:
 * - No response generation
 * - No conversation state changes
 * - No side effects
 */

import { classifyRelevance, type RelevanceResult } from './relevanceClassifier.js';
import { classifyIntent, type IntentResult } from './intentClassifier.js';

export interface RelevanceAndIntentSnapshot {
  relevant: boolean;
  relevanceConfidence: number;
  relevanceReason?: 'OUT_OF_DOMAIN' | 'SMALL_TALK' | 'SPAM';
  intent?: 'NEW_BOOKING' | 'RESCHEDULE' | 'CANCEL' | 'INFO_REQUEST';
  intentConfidence?: number;
  model: string;
}

/**
 * Classifies relevance and intent for an inbound message.
 * 
 * Process:
 * 1. Classify relevance first
 * 2. If not relevant, return early with reason
 * 3. If relevant, classify intent
 * 4. Return complete snapshot
 * 
 * Thresholds:
 * - relevanceConfidence < 0.6 → relevant = false
 * - intentConfidence < 0.7 → intent still returned (escalation handled later)
 * 
 * @param input - Message input
 * @returns Complete relevance and intent snapshot
 */
export async function classifyRelevanceAndIntent(input: {
  messageText: string;
  channel: 'whatsapp';
  language?: string;
}): Promise<RelevanceAndIntentSnapshot> {
  // Step 1: Classify relevance
  const relevanceResult = await classifyRelevance(input);

  // Step 2: If not relevant, return early
  if (!relevanceResult.relevant) {
    return {
      relevant: false,
      relevanceConfidence: relevanceResult.relevanceConfidence,
      relevanceReason: relevanceResult.reason,
      model: 'stub-v1',
    };
  }

  // Step 3: Classify intent (only if relevant)
  const intentResult = await classifyIntent(input);

  // Step 4: Return complete snapshot
  return {
    relevant: true,
    relevanceConfidence: relevanceResult.relevanceConfidence,
    intent: intentResult.intent,
    intentConfidence: intentResult.intentConfidence,
    model: intentResult.model,
  };
}
