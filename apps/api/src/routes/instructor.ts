import type { FastifyInstance } from 'fastify';
import { instructorEnsureProfileRoutes } from './instructor/ensure_profile.js';
import { instructorProfileRoutes } from './instructor/profile.js';
import { instructorAvailabilityRoutes } from './instructor/availability.js';
import { instructorServicesRoutes } from './instructor/services.js';
import { instructorMeetingPointsRoutes } from './instructor/meeting_points.js';
import { instructorGuardrailsRoutes } from './instructor/guardrails.js';
import { instructorWhatsappRoutes } from './instructor/whatsapp.js';
import { instructorInboxRoutes } from './instructor/inbox.js';
import { instructorReplyRoutes } from './instructor/reply.js';
import { instructorConversationsRoutes } from './instructor/conversations.js';
import { instructorDraftRoutes } from './instructor/drafts.js';
import { instructorCalendarRoutes } from './instructor/calendar.js';
import { instructorSlotsRoutes } from './instructor/slots.js';
import { instructorDashboardRoutes } from './instructor/dashboard.js';
import { instructorPoliciesDocumentRoutes } from './instructor/policies_document.js';
import { instructorBookingRoutes } from './instructor/bookings.js';
import { instructorBookingTimelineRoutes } from './instructor/booking_timeline.js';
import { instructorBookingAuditLogsRoutes } from './instructor/booking_audit_logs.js';
import { instructorConversationAiStateRoutes } from './instructor/conversation_ai_state.js';
import { instructorCustomersRoutes } from './instructor/customers.js';
import { instructorAIBookingSuggestionContextRoutes } from './instructor/ai_booking_suggestion_context.js';
import { instructorBookingDraftsRoutes } from './instructor/booking_drafts.js';
import { instructorStripeConnectRoutes } from './instructor/stripe_connect.js';
import { instructorPaymentLinkRoutes } from './instructor/payment_link.js';
import { instructorSubscriptionCheckoutRoutes } from './instructor/subscription_checkout.js';
import { instructorKpisRoutes } from './instructor/kpis.js';
import { instructorAIFeatureStatusRoutes } from './instructor/ai_feature_status.js';
import { instructorAIToggleWhatsAppRoutes } from './instructor/ai_toggle_whatsapp.js';

/**
 * Instructor routes (authenticated by JWT, no admin).
 *
 * Route prefixes: all instructor modules register full paths under /instructor/...
 * (e.g. /instructor/bookings/:id/submit, /instructor/bookings/:id/timeline).
 * Proxy: GET/POST /api/instructor/* → Fastify /instructor/*.
 */
export async function instructorRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(instructorEnsureProfileRoutes);
  await fastify.register(instructorProfileRoutes);
  await fastify.register(instructorDashboardRoutes);
  await fastify.register(instructorAvailabilityRoutes);
  await fastify.register(instructorSlotsRoutes);
  await fastify.register(instructorCalendarRoutes);
  await fastify.register(instructorServicesRoutes);
  await fastify.register(instructorMeetingPointsRoutes);
  await fastify.register(instructorPoliciesDocumentRoutes);
  await fastify.register(instructorGuardrailsRoutes);
  await fastify.register(instructorWhatsappRoutes);
  await fastify.register(instructorInboxRoutes);
  await fastify.register(instructorConversationsRoutes);
  await fastify.register(instructorDraftRoutes);
  await fastify.register(instructorReplyRoutes);
  await fastify.register(instructorBookingRoutes);
  await fastify.register(instructorBookingTimelineRoutes);
  await fastify.register(instructorBookingAuditLogsRoutes);
  await fastify.register(instructorConversationAiStateRoutes);
  await fastify.register(instructorCustomersRoutes);
  await fastify.register(instructorAIBookingSuggestionContextRoutes);
  await fastify.register(instructorBookingDraftsRoutes);
  await fastify.register(instructorStripeConnectRoutes);
  await fastify.register(instructorPaymentLinkRoutes);
  await fastify.register(instructorSubscriptionCheckoutRoutes);
  await fastify.register(instructorKpisRoutes);
  await fastify.register(instructorAIFeatureStatusRoutes);
  await fastify.register(instructorAIToggleWhatsAppRoutes);
}
