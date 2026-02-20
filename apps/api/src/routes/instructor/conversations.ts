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
import { now, logTiming, withTimeout } from '../../lib/timing.js';

const ROUTE_LIST = 'GET /instructor/conversations';
const CONVERSATIONS_LIST_TIMEOUT_MS = 12_000;
const INBOX_LIMIT = 20;

type Channel = 'whatsapp' | 'instagram' | 'web';
type Status = 'hot' | 'waiting' | 'resolved';

function mapChannel(channel: string): Channel {
  if (channel === 'instagram' || channel === 'web') return channel;
  return 'whatsapp';
}

function mapStatus(status: string): Status {
  if (status === 'requires_human') return 'hot';
  return 'waiting';
}

/**
 * Instructor conversations API (STEP 1 contract).
 * GET /instructor/conversations — list conversations for this instructor.
 * GET /instructor/conversations/:id/messages — messages for one conversation (instructor-scoped).
 * Auth: JWT. 401/403/404/500 as per contract.
 * Instrumentation: timing. Cap: 20 conversations. Fast-path: empty list on timeout.
 */
export async function instructorConversationsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get('/instructor/conversations', async (request, reply) => {
    const routeStart = now();

    try {
      const t0 = now();
      const userId = await getUserIdFromJwt(request);
      logTiming(ROUTE_LIST, 'getUserIdFromJwt', t0);

      const t1 = now();
      const profile = await getInstructorProfileByUserId(userId);
      logTiming(ROUTE_LIST, 'getInstructorProfileByUserId', t1);

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

      const t2 = now();
      let items;
      try {
        items = await withTimeout(
          getInstructorInbox(profile.id, INBOX_LIMIT),
          CONVERSATIONS_LIST_TIMEOUT_MS,
          'getInstructorInbox'
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('timed out')) {
          logTiming(ROUTE_LIST, 'getInstructorInbox_timeout', t2);
          return reply.send({ ok: true, conversations: [] });
        }
        throw err;
      }
      logTiming(ROUTE_LIST, 'getInstructorInbox', t2);
      logTiming(ROUTE_LIST, 'total', routeStart);

      const conversations = items.map((item) => ({
        id: item.conversation_id,
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
        customerProfileId: item.customer_profile_id ?? null,
        customerPhone: item.customer_phone ?? null,
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
