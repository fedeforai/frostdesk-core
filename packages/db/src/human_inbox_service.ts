import { assertAdminAccess } from './admin_access.js';
import { getHumanInboxRows } from './human_inbox_repository.js';

/**
 * Human Inbox Service (Admin Guard + Read Model)
 * 
 * WHAT IT DOES:
 * - Enforces admin access upfront
 * - Calls repository to get raw rows
 * - Transforms repository output to service read model
 * - Returns data ready for API consumption
 * 
 * WHAT IT DOES NOT DO:
 * - No SQL
 * - No mutations
 * - No business logic
 * - No side effects
 * - No filtering beyond repository
 */

export interface GetHumanInboxParams {
  userId: string;
  status?: string;
  channel?: string;
  /** Pilot/local only: when true, skip admin check (caller must set when ALLOW_DEBUG_USER and userId=debug-user). */
  _skipAdminCheck?: boolean;
}

export interface HumanInboxItem {
  conversation_id: string;
  channel: string;
  status: string;
  last_message: {
    direction: 'inbound' | 'outbound' | null;
    text: string | null;
    created_at: string | null;
  };
  last_activity_at: string;
  /** BookingDecision v1 — escalation visibility (read-only). true iff latest ai_snapshot.require_escalation === true. */
  needs_human: boolean;
  /** Latest ai_snapshot per conversation; audit only. Pass-through, no logic. */
  intent_confidence: number | null;
  /** Latest ai_snapshot per conversation; audit only. Pass-through, no logic. */
  relevance_confidence: number | null;
}

/**
 * Retrieves human inbox data for admin users (READ-ONLY).
 * 
 * Flow:
 * 1. Assert admin access (first line)
 * 2. Call repository
 * 3. Transform output to read model
 * 4. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of human inbox items, ordered by last_activity_at DESC
 * @throws UnauthorizedError if user is not an admin
 */
export async function getHumanInbox(
  params: GetHumanInboxParams
): Promise<HumanInboxItem[]> {
  const { userId, status, channel, _skipAdminCheck } = params;

  if (!_skipAdminCheck) {
    await assertAdminAccess(userId);
  }

  // Call repository
  const rows = await getHumanInboxRows({ status, channel });

  // Transform repository rows to service read model
  return rows.map((row) => ({
    conversation_id: row.conversation_id,
    channel: row.channel,
    status: row.status,
    last_message: {
      direction: row.last_message_direction,
      text: row.last_message_text,
      created_at: row.last_message_created_at,
    },
    last_activity_at: row.last_activity_at,
    // BookingDecision v1 — escalation visibility (read-only)
    needs_human: row.require_escalation === true,
    intent_confidence: row.intent_confidence ?? null,
    relevance_confidence: row.relevance_confidence ?? null,
  }));
}
