/**
 * Instructor-scoped conversation AI state (read + takeover).
 * GET  /instructor/conversations/:id/ai-state — return current ai_state
 * PATCH /instructor/conversations/:id/ai-state — set ai_state (writes audit_log, actor_type=instructor)
 */

import type { FastifyInstance } from 'fastify';
import {
  setConversationAiState,
  getConversationAiState,
  getInstructorProfileByUserId,
  getInstructorInbox,
  isValidUUID,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const AI_STATES = ['ai_on', 'ai_paused_by_human', 'ai_suggestion_only'] as const;
type AiState = (typeof AI_STATES)[number];

function isAiState(s: unknown): s is AiState {
  return typeof s === 'string' && AI_STATES.includes(s as AiState);
}

export async function instructorConversationAiStateRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{
    Params: { id: string };
  }>('/instructor/conversations/:id/ai-state', async (request, reply) => {
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
          error: ERROR_CODES.ONBOARDING_REQUIRED,
          message: 'Onboarding must be completed',
        });
      }

      const conversationId = (request.params as { id: string }).id;
      if (!conversationId?.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'Conversation id required',
        });
      }
      if (!isValidUUID(conversationId)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'Invalid conversation ID format (must be UUID)',
        });
      }

      const items = await getInstructorInbox(profile.id);
      const owned = items.some((i) => i.conversation_id === conversationId);
      if (!owned) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Conversation not found or not owned',
        });
      }

      const state = await getConversationAiState(conversationId);
      return reply.send({ ok: true, ai_state: state });
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  app.patch<{
    Params: { id: string };
    Body: { ai_state?: unknown };
  }>('/instructor/conversations/:id/ai-state', async (request, reply) => {
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
          error: ERROR_CODES.ONBOARDING_REQUIRED,
          message: 'Onboarding must be completed',
        });
      }

      const conversationId = (request.params as { id: string }).id;
      if (!conversationId?.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'Conversation id required',
        });
      }
      if (!isValidUUID(conversationId)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'Invalid conversation ID format (must be UUID)',
        });
      }

      const body = request.body as { ai_state?: unknown };
      if (!body?.ai_state || !isAiState(body.ai_state)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: `ai_state must be one of: ${AI_STATES.join(', ')}`,
        });
      }

      const items = await getInstructorInbox(profile.id);
      const owned = items.some((i) => i.conversation_id === conversationId);
      if (!owned) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Conversation not found or not owned',
        });
      }

      await setConversationAiState({
        conversationId,
        nextState: body.ai_state,
        actorType: 'human',
        actorId: userId,
        reason: 'instructor_ai_state_change',
      });

      const state = await getConversationAiState(conversationId);
      return reply.send({ ok: true, ai_state: state });
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
