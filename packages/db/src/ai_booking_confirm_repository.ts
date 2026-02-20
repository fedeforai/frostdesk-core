/**
 * AI Booking Draft → Booking Confirmation (P2.1)
 *
 * Single atomic transaction. One source of truth.
 *
 * What it does:
 *   1. SELECT draft FOR UPDATE (lock + ownership)
 *   2. Idempotency: if confirmed_booking_id exists → return it
 *   3. Resolve customer_id from phone (best-effort)
 *   4. INSERT INTO bookings with all draft fields
 *   5. UPDATE draft: status=confirmed, confirmed_booking_id
 *   6. INSERT booking_audit_log
 *   7. COMMIT
 *
 * What it does NOT do:
 *   - No automatic confirmation (booking starts as 'draft')
 *   - No calendar writes
 *   - No payment logic
 *   - No side effects outside the transaction
 */

import { sql } from './client.js';

function txAsSql(tx: unknown): typeof sql {
  return tx as unknown as typeof sql;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmAIBookingDraftInput {
  /** The AI booking draft UUID. */
  draftId: string;
  /** Instructor UUID (must match draft.instructor_id). */
  instructorId: string;
  /** The user performing the action (for audit). */
  actorUserId: string;
  /** Unique request ID for idempotency. */
  requestId: string;
  /** HTTP metadata for audit. */
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ConfirmAIBookingDraftResult {
  bookingId: string;
  /** True if this was a duplicate request and the existing booking was returned. */
  alreadyConfirmed: boolean;
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Atomically creates a booking from an AI draft.
 *
 * Idempotent: if the draft was already confirmed, returns the existing booking ID.
 * Ownership: instructor_id must match.
 * Transaction: all-or-nothing.
 *
 * Throws if:
 *   - Draft not found
 *   - Draft not in 'pending_review' state (unless already confirmed → idempotent)
 *   - Instructor doesn't own the draft
 */
export async function confirmAIBookingDraftWithAudit(
  input: ConfirmAIBookingDraftInput,
): Promise<ConfirmAIBookingDraftResult> {
  return await sql.begin(async (tx) => {
    const db = txAsSql(tx);

    // ── Step 1: Lock and fetch draft ────────────────────────────────────
    const drafts = await db<Array<{
      id: string;
      instructor_id: string;
      conversation_id: string;
      status: string;
      confirmed_booking_id: string | null;
      customer_name: string | null;
      customer_phone: string | null;
      booking_date: string | null;
      start_time: string | null;
      end_time: string | null;
      duration_minutes: number | null;
      party_size: number | null;
      skill_level: string | null;
      lesson_type: string | null;
      sport: string | null;
      resort: string | null;
      meeting_point_text: string | null;
      service_id: string | null;
      meeting_point_id: string | null;
      notes: string | null;
      raw_extraction: Record<string, unknown> | null;
    }>>`
      SELECT
        id, instructor_id, conversation_id, status, confirmed_booking_id,
        customer_name, customer_phone, booking_date, start_time, end_time,
        duration_minutes, party_size, skill_level, lesson_type, sport,
        resort, meeting_point_text, service_id, meeting_point_id,
        notes, raw_extraction
      FROM ai_booking_drafts
      WHERE id = ${input.draftId}::uuid
      FOR UPDATE
    `;

    if (drafts.length === 0) {
      throw new Error('Draft not found');
    }

    const draft = drafts[0];

    // ── Step 1b: Ownership check ────────────────────────────────────────
    if (draft.instructor_id !== input.instructorId) {
      throw new Error('Draft not found'); // Don't leak existence
    }

    // ── Step 2: Idempotency — already confirmed → return existing ───────
    if (draft.confirmed_booking_id) {
      return { bookingId: draft.confirmed_booking_id, alreadyConfirmed: true };
    }

    if (draft.status !== 'pending_review') {
      throw new Error(`Draft cannot be confirmed: status is '${draft.status}'`);
    }

    // ── Step 3: Resolve customer_id from phone (best-effort) ────────────
    let customerId: string | null = null;
    if (draft.customer_phone) {
      const customers = await db<Array<{ id: string }>>`
        SELECT id FROM customer_profiles
        WHERE instructor_id = ${input.instructorId}::uuid
          AND phone_number = ${draft.customer_phone}
        LIMIT 1
      `;
      customerId = customers[0]?.id ?? null;
    }

    // ── Step 4: Build start/end timestamps from date + time ─────────────
    // Draft stores booking_date (DATE) + start_time/end_time (TIME) separately.
    // Bookings table uses start_time/end_time as TIMESTAMPTZ.
    const bookingDateStr = draft.booking_date ?? new Date().toISOString().slice(0, 10);
    const startTimeStr = draft.start_time ?? '09:00:00';
    const endTimeStr = draft.end_time ?? '10:00:00';
    const startTimestamp = `${bookingDateStr}T${startTimeStr}`;
    const endTimestamp = `${bookingDateStr}T${endTimeStr}`;

    // ── Step 5: INSERT booking (conversation_id for in-thread context) ────
    const bookingRows = await db<Array<{ id: string }>>`
      INSERT INTO public.bookings (
        instructor_id,
        conversation_id,
        customer_id,
        customer_name,
        phone,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        party_size,
        skill_level,
        service_id,
        meeting_point_id,
        notes,
        status
      ) VALUES (
        ${input.instructorId}::uuid,
        ${draft.conversation_id}::uuid,
        ${customerId}::uuid,
        ${draft.customer_name ?? null},
        ${draft.customer_phone ?? null},
        ${bookingDateStr}::date,
        ${startTimestamp}::timestamptz,
        ${endTimestamp}::timestamptz,
        ${draft.duration_minutes ?? null},
        ${draft.party_size ?? 1},
        ${draft.skill_level ?? null},
        ${draft.service_id ?? null},
        ${draft.meeting_point_id ?? null},
        ${draft.meeting_point_text ?? null},
        'draft'
      )
      RETURNING id
    `;

    const bookingId = bookingRows[0].id;

    // ── Step 6: UPDATE draft → confirmed + link booking ─────────────────
    await db`
      UPDATE ai_booking_drafts
      SET status = 'confirmed',
          reviewed_at = now(),
          confirmed_booking_id = ${bookingId}::uuid
      WHERE id = ${input.draftId}::uuid
    `;

    // ── Step 7: Audit log ───────────────────────────────────────────────
    await db`
      INSERT INTO public.booking_audit_log (
        instructor_id,
        actor_user_id,
        action,
        request_id,
        booking_id,
        draft_payload,
        user_agent,
        ip_address
      ) VALUES (
        ${input.instructorId}::uuid,
        ${input.actorUserId}::uuid,
        'AI_DRAFT_CONFIRMED',
        ${input.requestId},
        ${bookingId}::uuid,
        ${JSON.stringify({
          draft_id: input.draftId,
          customer_name: draft.customer_name,
          customer_phone: draft.customer_phone,
          booking_date: draft.booking_date,
          start_time: draft.start_time,
          end_time: draft.end_time,
          duration_minutes: draft.duration_minutes,
          party_size: draft.party_size,
          skill_level: draft.skill_level,
          sport: draft.sport,
          resort: draft.resort,
          extraction: draft.raw_extraction,
        })}::jsonb,
        ${input.userAgent ?? null},
        ${input.ipAddress ?? null}
      )
    `;

    // ── Step 8: Also insert into booking_audit for timeline ─────────────
    await db`
      INSERT INTO booking_audit (
        booking_id,
        previous_state,
        new_state,
        event_type,
        from_status,
        to_status,
        actor,
        created_at
      ) VALUES (
        ${bookingId}::uuid,
        null,
        'draft',
        'booking_created_from_ai_draft',
        null,
        'draft',
        'human',
        now()
      )
    `;

    return { bookingId, alreadyConfirmed: false };
  });
}
