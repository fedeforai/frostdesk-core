import { sql } from './client.js';

export interface ConfirmAIBookingDraftInput {
  instructorId: string;
  actorUserId: string;

  requestId: string;

  startTime: string;
  endTime: string;

  serviceId?: string | null;
  meetingPointId?: string | null;
  customerName?: string | null;
  notes?: string | null;

  draftPayload: unknown;

  userAgent?: string | null;
  ipAddress?: string | null;
}

export async function confirmAIBookingDraftWithAudit(
  input: ConfirmAIBookingDraftInput
): Promise<{ bookingId: string }> {
  return await sql.begin(async (sql) => {
    // Idempotency guard: if request already used, return existing booking id
    const existing = await sql<{ booking_id: string }[]>`
      SELECT booking_id
      FROM public.booking_audit_log
      WHERE instructor_id = ${input.instructorId} AND request_id = ${input.requestId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return { bookingId: existing[0].booking_id };
    }

    // Create booking
    const createdBooking = await sql<{ id: string }[]>`
      INSERT INTO public.bookings (
        instructor_id,
        customer_name,
        start_time,
        end_time,
        service_id,
        meeting_point_id,
        notes
      ) VALUES (
        ${input.instructorId},
        ${input.customerName ?? null},
        ${input.startTime},
        ${input.endTime},
        ${input.serviceId ?? null},
        ${input.meetingPointId ?? null},
        ${input.notes ?? null}
      )
      RETURNING id
    `;

    const bookingId = createdBooking[0].id;

    // Create audit log
    await sql`
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
        ${input.instructorId},
        ${input.actorUserId},
        'AI_DRAFT_CONFIRMED',
        ${input.requestId},
        ${bookingId},
        ${JSON.stringify(input.draftPayload ?? {})}::jsonb,
        ${input.userAgent ?? null},
        ${input.ipAddress ?? null}
      )
    `;

    return { bookingId };
  });
}
