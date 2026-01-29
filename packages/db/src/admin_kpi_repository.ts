import { sql } from './client.js';

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

/**
 * Aggregates KPI snapshot for today (read-only).
 * 
 * KPIs:
 * - conversations_today: COUNT(*) from conversations where DATE(created_at) = CURRENT_DATE
 * - ai_drafts_pending: COUNT(DISTINCT conversation_id) from message_metadata where key = 'ai_draft' and no outbound message sent
 * - human_overrides_today: COUNT(*) from booking_audit where actor = 'human' and DATE(created_at) = CURRENT_DATE
 * - bookings_created_today: COUNT(*) from bookings where DATE(created_at) = CURRENT_DATE
 */
export async function getAdminKPISnapshot(): Promise<AdminKPISnapshot> {
  // Conversations today
  const conversationsResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM conversations
    WHERE DATE(created_at) = CURRENT_DATE
  `;
  const conversations_today = conversationsResult[0]?.count ? parseInt(conversationsResult[0].count, 10) : 0;

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
  const ai_drafts_pending = draftsResult[0]?.count ? parseInt(draftsResult[0].count, 10) : 0;

  // Human overrides today
  const overridesResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM booking_audit
    WHERE actor = 'human'
      AND DATE(created_at) = CURRENT_DATE
  `;
  const human_overrides_today = overridesResult[0]?.count ? parseInt(overridesResult[0].count, 10) : 0;

  // Bookings created today
  const bookingsResult = await sql<Array<{ count: string }>>`
    SELECT COUNT(*)::int as count
    FROM bookings
    WHERE DATE(created_at) = CURRENT_DATE
  `;
  const bookings_created_today = bookingsResult[0]?.count ? parseInt(bookingsResult[0].count, 10) : 0;

  return {
    conversations_today,
    ai_drafts_pending,
    human_overrides_today,
    bookings_created_today,
  };
}
