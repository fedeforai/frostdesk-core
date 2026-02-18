/**
 * Suggested actions for instructor inbox: only when human intervention
 * requires an action (not just a text reply), and relevant to the conversation.
 */

import {
  getPendingBookingDraftByConversation,
  getConfirmedBookingIdsByConversation,
} from './ai_booking_draft_repository_v2.js';
import { getBookingPayment } from './booking_payment_connect_repository.js';
import type { PaymentStatus } from './booking_payment_connect_repository.js';

export interface SuggestedAction {
  id: string;
  label: string;
  payload?: { bookingDraftId?: string; bookingId?: string };
}

const UNPAID_STATUSES: PaymentStatus[] = ['unpaid', 'pending', 'failed'];

/**
 * Returns suggested actions for a conversation. Only includes actions when
 * there is something to do (confirm draft, create payment link), not when
 * only a text reply is needed.
 */
export async function getSuggestedActionsForConversation(
  conversationId: string,
  instructorId: string
): Promise<SuggestedAction[]> {
  const actions: SuggestedAction[] = [];

  // 1. Pending booking draft → confirm booking proposal
  const pendingDraft = await getPendingBookingDraftByConversation(
    conversationId,
    instructorId
  );
  if (pendingDraft) {
    actions.push({
      id: 'confirm_booking_draft',
      label: 'Confirm booking proposal',
      payload: { bookingDraftId: pendingDraft.id },
    });
  }

  // 2. Confirmed bookings from this conversation that are unpaid → create payment link
  const confirmedBookingIds = await getConfirmedBookingIdsByConversation(
    conversationId,
    instructorId
  );
  for (const bookingId of confirmedBookingIds) {
    const payment = await getBookingPayment(bookingId, instructorId);
    if (payment && UNPAID_STATUSES.includes(payment.payment_status)) {
      actions.push({
        id: 'create_payment_link',
        label: 'Create payment link',
        payload: { bookingId },
      });
      // One payment link suggestion per conversation is enough
      break;
    }
  }

  return actions;
}
