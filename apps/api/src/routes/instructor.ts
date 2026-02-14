import type { FastifyInstance } from 'fastify';
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
import { instructorConversationAiStateRoutes } from './instructor/conversation_ai_state.js';
import { instructorCustomersRoutes } from './instructor/customers.js';
import { instructorAIBookingSuggestionContextRoutes } from './instructor/ai_booking_suggestion_context.js';

/**
 * Instructor routes (authenticated by JWT, no admin).
 *
 * Route prefixes: all instructor modules register full paths under /instructor/...
 * (e.g. /instructor/bookings/:id/submit, /instructor/bookings/:id/timeline).
 * Proxy: GET/POST /api/instructor/* → Fastify /instructor/*.
 */
export async function instructorRoutes(fastify: FastifyInstance): Promise<void> {
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
  await fastify.register(instructorConversationAiStateRoutes);
  await fastify.register(instructorCustomersRoutes);
  await fastify.register(instructorAIBookingSuggestionContextRoutes);
}
