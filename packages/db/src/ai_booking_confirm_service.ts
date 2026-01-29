import { confirmAIBookingDraftWithAudit } from './ai_booking_confirm_repository.js';

export interface ConfirmAIBookingDraftPayload {
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

export async function confirmAIBookingDraftService(
  userId: string,
  payload: ConfirmAIBookingDraftPayload
): Promise<{ bookingId: string }> {
  // Ownership: instructorId === userId
  return confirmAIBookingDraftWithAudit({
    instructorId: userId,
    actorUserId: userId,
    requestId: payload.requestId,
    startTime: payload.startTime,
    endTime: payload.endTime,
    serviceId: payload.serviceId ?? null,
    meetingPointId: payload.meetingPointId ?? null,
    customerName: payload.customerName ?? null,
    notes: payload.notes ?? null,
    draftPayload: payload.draftPayload,
    userAgent: payload.userAgent ?? null,
    ipAddress: payload.ipAddress ?? null,
  });
}
