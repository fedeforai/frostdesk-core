/**
 * Loop 6: Decision timeline for a conversation (read-only).
 * GET /instructor/conversations/:id/timeline
 */

import type { FastifyInstance } from 'fastify';
import {
  getConversationById,
  getConversationDecisionTimeline,
  getInstructorProfileByUserId,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as any).code = ERROR_CODES.NOT_FOUND;
    throw e;
  }
  return profile.id;
}

export async function instructorConversationTimelineRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/instructor/conversations/:id/timeline',
    async (request, reply) => {
      try {
        const instructorId = await getInstructorId(request);
        const conversationId = (request.params as { id: string }).id;

        const conv = await getConversationById(conversationId);
        if (!conv) {
          return reply.status(404).send({
            ok: false,
            error: ERROR_CODES.CONVERSATION_NOT_FOUND,
            message: 'Conversation not found',
          });
        }

        const ownerId = String(conv.instructor_id);
        if (ownerId !== instructorId) {
          return reply.status(403).send({
            ok: false,
            error: ERROR_CODES.FORBIDDEN,
            message: 'You do not own this conversation',
          });
        }

        const timeline = await getConversationDecisionTimeline(conversationId);
        return reply.send({
          conversation_id: conversationId,
          timeline,
        });
      } catch (err) {
        const normalized = normalizeError(err);
        return reply
          .status(mapErrorToHttp(normalized.error))
          .send({ ok: false, error: normalized.error, message: normalized.message });
      }
    }
  );
}
