import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorInbox,
  insertInstructorReply,
  markConversationHumanHandled,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReplyBody = { text?: unknown };

function getText(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('text' in body)) return null;
  const t = (body as ReplyBody).text;
  return typeof t === 'string' ? t.trim() : null;
}

/**
 * Instructor reply routes (FEATURE 2.8 — manual reply v1).
 * POST /instructor/inbox/:conversation_id/reply — send text reply (onboarding gate, ownership).
 * Human-only. No AI, no webhook. Writes message + closes needs_human.
 */
export async function instructorReplyRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { conversation_id: string };
    Body: unknown;
  }>('/instructor/inbox/:conversation_id/reply', async (request, reply) => {
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
          message: 'Onboarding must be completed to reply',
        });
      }

      const conversationId = request.params.conversation_id;
      if (!conversationId || !UUID_REGEX.test(conversationId)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid or missing conversation_id',
        });
      }

      const text = getText(request.body);
      if (text === null || text.length === 0) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_TEXT },
          message: 'Body must include non-empty text',
        });
      }

      const items = await getInstructorInbox(profile.id);
      const owned = items.some((i) => i.conversation_id === conversationId);
      if (!owned) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Conversation not found or not owned',
        });
      }

      const message = await insertInstructorReply({
        conversationId,
        instructorId: profile.id,
        text,
      });
      await markConversationHumanHandled(conversationId);

      return reply.status(201).send({
        ok: true,
        message: {
          id: message.id,
          conversation_id: message.conversation_id,
          direction: message.direction,
          text: message.text,
          created_at: message.created_at,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      const code =
        normalized.error === ERROR_CODES.CONVERSATION_NOT_FOUND
          ? ERROR_CODES.NOT_FOUND
          : normalized.error;
      return reply.status(httpStatus).send({
        ok: false,
        error: code,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
}
