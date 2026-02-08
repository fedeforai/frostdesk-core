import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorInbox,
  getConversationById,
  getMessagesByConversation,
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
        customerName: (item.customer_identifier || '').trim() || 'Customer',
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
}
