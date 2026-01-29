import { sql } from './client.js';

export interface AdminDashboardMetrics {
  total_conversations: number;
  pending_ai_drafts: number;
  active_bookings: number;
  overrides_today: number;
}

/**
 * Aggregates dashboard metrics (read-only).
 * 
 * Metrics:
 * - total_conversations: COUNT(*) from conversations
 * - pending_ai_drafts: COUNT(*) from message_metadata where key = 'ai_draft' and no outbound message sent
 * - active_bookings: COUNT(*) from bookings where status IN ('pending', 'confirmed')
 * - overrides_today: COUNT(*) from booking_audit where actor = 'human' and DATE(created_at) = CURRENT_DATE
 */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  // Total conversations
  const conversationsResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM conversations
  `;
  const total_conversations = conversationsResult[0]?.count ? parseInt(conversationsResult[0].count, 10) : 0;

  // Pending AI drafts: drafts that haven't been sent (no outbound message with sender_identity='human' or 'ai' for that conversation)
  const draftsResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(DISTINCT mm.conversation_id)::int as count
    FROM message_metadata mm
    WHERE mm.key = 'ai_draft'
      AND NOT EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.conversation_id = mm.conversation_id
          AND m.direction = 'outbound'
          AND (m.sender_identity = 'human' OR m.sender_identity = 'ai')
      )
  `;
  const pending_ai_drafts = draftsResult[0]?.count ? parseInt(draftsResult[0].count, 10) : 0;

  // Active bookings: pending or confirmed
  const bookingsResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM bookings
    WHERE status IN ('pending', 'confirmed')
  `;
  const active_bookings = bookingsResult[0]?.count ? parseInt(bookingsResult[0].count, 10) : 0;

  // Overrides today: human actor in booking_audit for today
  const overridesResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM booking_audit
    WHERE actor = 'human'
      AND DATE(created_at) = CURRENT_DATE
  `;
  const overrides_today = overridesResult[0]?.count ? parseInt(overridesResult[0].count, 10) : 0;

  return {
    total_conversations,
    pending_ai_drafts,
    active_bookings,
    overrides_today,
  };
}
