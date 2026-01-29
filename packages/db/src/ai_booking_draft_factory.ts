import { AIBookingDraft } from './ai_booking_draft_types.js';

/**
 * Creates an ephemeral AI booking draft.
 *
 * IMPORTANT:
 * - This function MUST NOT persist anything.
 * - This function MUST NOT validate availability.
 * - This function MUST NOT interact with calendar or bookings.
 * - This function MUST remain deterministic.
 */
export function createAIBookingDraft(params: {
  instructorId: string;
  startTime: string;
  endTime: string;
  serviceId?: string | null;
  meetingPointId?: string | null;
  customerName?: string | null;
  draftReason: string;
}): AIBookingDraft {
  return {
    instructor_id: params.instructorId,
    start_time: params.startTime,
    end_time: params.endTime,
    service_id: params.serviceId ?? null,
    meeting_point_id: params.meetingPointId ?? null,
    customer_name: params.customerName ?? null,
    draft_reason: params.draftReason,
    created_at: new Date().toISOString(),
  };
}
