import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorInbox,
  getConversationById,
  getMessagesByConversation,
  getUpcomingBookingsByConversation,
  getPendingBookingDraftByConversation,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type Channel = 'whatsapp' | 'instagram' | 'web';
type Status = 'hot' | 'waiting' | 'resolved';

function mapChannel(channel: string): Channel {
  if (channel === 'instagram' || channel === 'web') return channel;
  return 'whatsapp';
}

function mapStatus(status: string): Status {
  // RULES:
  // - "hot" stays hot until the CUSTOMER replies again.
  // - "resolved" only when booking is confirmed (we do NOT have that signal in STEP 1 inbox list),
  //   so we must NOT mark resolved based on generic "closed/resolved" flags coming from legacy status.
  // - Everything else is "waiting".
  if (status === 'requires_human') return 'hot';
  return 'waiting';
}

/**
 * Instructor conversations API (STEP 1 contract).
 * GET /instructor/conversations — list conversations for this instructor.
 * GET /instructor/conversations/:id/messages — messages for one conversation (instructor-scoped).
 * Auth: JWT. 401/403/404/500 as per contract.
 */
export async function instructorConversationsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get('/instructor/conversations', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }

      const items = await getInstructorInbox(profile.id);
      const conversations = items.map((item) => ({
        id: item.conversation_id,
        // CM-2: prefer display_name from customer_profiles, fall back to phone identifier
        customerName:
          item.customer_display_name?.trim()
          || (item.customer_identifier || '').trim()
          || 'Customer',
        channel: mapChannel(item.channel),
        lastMessagePreview: item.last_message?.text?.slice(0, 200) ?? '',
        updatedAt: item.last_activity_at,
        status: mapStatus(item.status),
        unreadCount:
          typeof (item as any).unread_count === 'number'
            ? (item as any).unread_count
            : typeof (item as any).unreadCount === 'number'
              ? (item as any).unreadCount
              : 0,
        // CM-2: customer profile link
        customerProfileId: item.customer_profile_id ?? null,
        customerPhone: item.customer_phone ?? null,
        // CM-3: trust signals
        customerBookingsCount: item.customer_bookings_count,
        customerNotesCount: item.customer_notes_count,
        customerFirstSeenAt: item.customer_first_seen_at ?? null,
        customerLastSeenAt: item.customer_last_seen_at ?? null,
        isKnownCustomer: (item.customer_bookings_count > 0 || item.customer_notes_count > 0),
      }));

      return reply.send({ ok: true, conversations });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  app.get<{
    Params: { id: string };
  }>('/instructor/conversations/:id/messages', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }

      const conversationId = request.params.id;
      const conv = await getConversationById(conversationId);

      if (!conv) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.CONVERSATION_NOT_FOUND },
          message: 'Conversation not found',
        });
      }

      const instructorId = String(conv.instructor_id);
      if (instructorId !== profile.id) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ADMIN_ONLY },
          message: 'Not authorized',
        });
      }

      const rows = await getMessagesByConversation(conversationId);
      const messages = rows.map((row) => ({
        id: row.id,
        role: row.direction === 'inbound' ? ('customer' as const) : ('instructor' as const),
        text: row.content ?? '',
        createdAt: row.created_at,
      }));

      return reply.send({ ok: true, messages });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  // GET /instructor/conversations/:id/context — upcoming bookings and pending booking draft for in-thread actions
  app.get<{ Params: { id: string } }>('/instructor/conversations/:id/context', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Not authorized',
        });
      }
      const conversationId = request.params.id;
      const conv = await getConversationById(conversationId);
      if (!conv) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.CONVERSATION_NOT_FOUND },
          message: 'Conversation not found',
        });
      }
      const instructorId = String(conv.instructor_id);
      if (instructorId !== profile.id) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ADMIN_ONLY },
          message: 'Not authorized',
        });
      }
      const [upcomingBookings, pendingDraft] = await Promise.all([
        getUpcomingBookingsByConversation(conversationId, instructorId),
        getPendingBookingDraftByConversation(conversationId, instructorId),
      ]);
      const upcoming_bookings = upcomingBookings.map((b) => ({
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        customer_name: b.customer_name ?? b.customer_display_name ?? null,
        payment_status: b.payment_status ?? null,
      }));
      const pending_booking_draft = pendingDraft
        ? {
            id: pendingDraft.id,
            conversation_id: pendingDraft.conversation_id,
            booking_date: pendingDraft.booking_date,
            start_time: pendingDraft.start_time,
            end_time: pendingDraft.end_time,
            duration_minutes: pendingDraft.duration_minutes,
            party_size: pendingDraft.party_size,
            customer_name: pendingDraft.customer_name ?? null,
            customer_phone: pendingDraft.customer_phone ?? null,
            meeting_point_text: pendingDraft.meeting_point_text ?? null,
            service_id: pendingDraft.service_id ?? null,
            meeting_point_id: pendingDraft.meeting_point_id ?? null,
            skill_level: pendingDraft.skill_level ?? null,
            lesson_type: pendingDraft.lesson_type ?? null,
            sport: pendingDraft.sport ?? null,
            resort: pendingDraft.resort ?? null,
          }
        : null;
      return reply.send({
        ok: true,
        upcoming_bookings,
        pending_booking_draft,
      });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
}
