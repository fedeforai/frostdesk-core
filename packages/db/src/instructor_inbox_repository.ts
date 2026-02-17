import { sql } from './client.js';

/**
 * Instructor Inbox Repository (READ-ONLY)
 *
 * Returns conversations for a single instructor with last message, needs_human signal,
 * and customer profile data (CM-2/CM-3: name, bookings count, notes count, last seen).
 *
 * needs_human: true only when latest ai_snapshot says escalation AND no outbound message
 * after that snapshot (FEATURE 2.8: instructor reply closes the loop).
 */

export type InstructorInboxItem = {
  conversation_id: string;
  customer_identifier: string;
  channel: string;
  status: string;
  last_message: {
    direction: 'inbound' | 'outbound';
    text: string;
    created_at: string;
  } | null;
  last_activity_at: string;
  needs_human: boolean;
  // CM-2: customer profile link
  customer_profile_id: string | null;
  customer_display_name: string | null;
  customer_phone: string | null;
  // CM-3: trust signals
  customer_bookings_count: number;
  customer_notes_count: number;
  customer_first_seen_at: string | null;
  customer_last_seen_at: string | null;
};

type InstructorInboxRow = {
  conversation_id: string;
  customer_identifier: string;
  channel: string;
  status: string;
  last_message_direction: 'inbound' | 'outbound' | null;
  last_message_text: string | null;
  last_message_created_at: string | null;
  last_activity_at: string;
  needs_human: boolean;
  // Customer profile
  customer_profile_id: string | null;
  customer_display_name: string | null;
  customer_phone: string | null;
  // Customer stats
  customer_bookings_count: string | null;
  customer_notes_count: string | null;
  customer_first_seen_at: string | null;
  customer_last_seen_at: string | null;
};

/**
 * Gets instructor inbox: conversations for this instructor with last message,
 * needs_human signal, and customer profile data.
 *
 * Read-only. Filtered by instructor_id. Ordered by last_activity_at DESC.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id, UUID)
 * @returns List of inbox items
 */
export async function getInstructorInbox(
  instructorId: string
): Promise<InstructorInboxItem[]> {
  const result = await sql<InstructorInboxRow[]>`
    WITH last_messages AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        direction AS last_message_direction,
        message_text AS last_message_text,
        created_at AS last_message_created_at
      FROM messages
      WHERE conversation_id IS NOT NULL
      ORDER BY conversation_id, created_at DESC
    ),
    conversation_activity AS (
      SELECT
        c.id AS conversation_id,
        c.instructor_id,
        c.customer_identifier,
        c.channel,
        c.status,
        c.customer_id,
        COALESCE(MAX(m.created_at), c.created_at) AS last_activity_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id, c.instructor_id, c.customer_identifier, c.channel, c.status, c.customer_id, c.created_at
    ),
    -- Resolve customer_profile_id: prefer FK (customer_id), fallback to phone match
    resolved_customer AS (
      SELECT
        ca.conversation_id,
        COALESCE(ca.customer_id, cp_phone.id) AS customer_profile_id
      FROM conversation_activity ca
      LEFT JOIN customer_profiles cp_phone
        ON cp_phone.instructor_id = ca.instructor_id
        AND cp_phone.phone_number = ca.customer_identifier
        AND ca.customer_id IS NULL
    ),
    customer_stats AS (
      SELECT
        cp.id AS profile_id,
        COALESCE(bc.cnt, 0) AS bookings_count,
        COALESCE(nc.cnt, 0) AS notes_count
      FROM customer_profiles cp
      LEFT JOIN (
        SELECT customer_id, COUNT(*)::int AS cnt
        FROM bookings
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) bc ON bc.customer_id = cp.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*)::int AS cnt
        FROM customer_notes
        GROUP BY customer_id
      ) nc ON nc.customer_id = cp.id
      WHERE cp.instructor_id = ${instructorId}::uuid
    )
    SELECT
      ca.conversation_id,
      ca.customer_identifier,
      ca.channel,
      ca.status,
      lm.last_message_direction,
      lm.last_message_text,
      lm.last_message_created_at,
      ca.last_activity_at,
      COALESCE((
        SELECT (s.relevant = true AND s.intent IN ('NEW_BOOKING', 'RESCHEDULE')
          AND (s.intent_confidence < 0.7 OR s.relevance_confidence < 0.7)
          AND NOT EXISTS (
            SELECT 1 FROM messages m
            WHERE m.conversation_id = ca.conversation_id
              AND m.direction = 'outbound'
              AND m.created_at > s.created_at
          ))
        FROM ai_snapshots s
        WHERE s.conversation_id = ca.conversation_id
        ORDER BY s.created_at DESC
        LIMIT 1
      ), false) AS needs_human,
      -- CM-2: customer profile (resolved via FK or phone fallback)
      cp.id AS customer_profile_id,
      cp.display_name AS customer_display_name,
      cp.phone_number AS customer_phone,
      -- CM-3: trust signals
      COALESCE(cs.bookings_count, 0)::text AS customer_bookings_count,
      COALESCE(cs.notes_count, 0)::text AS customer_notes_count,
      cp.first_seen_at AS customer_first_seen_at,
      cp.last_seen_at AS customer_last_seen_at
    FROM conversation_activity ca
    LEFT JOIN last_messages lm ON lm.conversation_id = ca.conversation_id
    LEFT JOIN resolved_customer rc ON rc.conversation_id = ca.conversation_id
    LEFT JOIN customer_profiles cp ON cp.id = rc.customer_profile_id
    LEFT JOIN customer_stats cs ON cs.profile_id = rc.customer_profile_id
    WHERE ca.instructor_id = ${instructorId}::uuid
    ORDER BY ca.last_activity_at DESC
  `;

  return result.map((row) => ({
    conversation_id: row.conversation_id,
    customer_identifier: row.customer_identifier ?? '',
    channel: row.channel,
    status: row.status,
    last_message:
      row.last_message_direction != null &&
      row.last_message_text != null &&
      row.last_message_created_at != null
        ? {
            direction: row.last_message_direction as 'inbound' | 'outbound',
            text: row.last_message_text,
            created_at: row.last_message_created_at,
          }
        : null,
    last_activity_at: row.last_activity_at,
    needs_human: row.needs_human ?? false,
    // CM-2
    customer_profile_id: row.customer_profile_id ?? null,
    customer_display_name: row.customer_display_name ?? null,
    customer_phone: row.customer_phone ?? null,
    // CM-3
    customer_bookings_count: Number(row.customer_bookings_count) || 0,
    customer_notes_count: Number(row.customer_notes_count) || 0,
    customer_first_seen_at: row.customer_first_seen_at ?? null,
    customer_last_seen_at: row.customer_last_seen_at ?? null,
  }));
}
