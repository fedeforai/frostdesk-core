import { assertAdminAccess } from './admin_access.js';
import { getConversationTimeline, type TimelineEvent } from './conversation_timeline_repository.js';

/**
 * Admin-only service wrapper for conversation timeline.
 *
 * WHAT IT DOES:
 * - Enforces admin access
 * - Returns read-only timeline events
 *
 * WHAT IT DOES NOT DO:
 * - No mutation
 * - No enrichment
 * - No inference
 */
export async function getConversationTimelineReadModel(params: {
  userId: string;
  conversationId: string;
}): Promise<TimelineEvent[]> {
  const { userId, conversationId } = params;

  // Guard: admin only
  await assertAdminAccess(userId);

  // Delegate to repository
  return getConversationTimeline(conversationId);
}
