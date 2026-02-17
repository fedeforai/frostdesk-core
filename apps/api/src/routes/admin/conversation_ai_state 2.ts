/**
 * Loop 3: Admin API for explicit AI state (ai_on | ai_paused_by_human | ai_suggestion_only).
 * Use for manual pause, reactivate, or set ai_suggestion_only (ambiguity/risk).
 */

import type { FastifyInstance } from 'fastify';
import {
  setConversationAiState,
  getConversationAiState,
  isValidUUID,
} from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const AI_STATES = ['ai_on', 'ai_paused_by_human', 'ai_suggestion_only'] as const;

export async function adminConversationAiStateRoutes(app: FastifyInstance): Promise<void> {
  app.patch('/admin/conversations/:id/ai-state', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const conversationId = (request.params as { id: string }).id;
      const body = request.body as { ai_state?: string };

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
      if (
        !body?.ai_state ||
        !AI_STATES.includes(body.ai_state as (typeof AI_STATES)[number])
      ) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: `ai_state must be one of: ${AI_STATES.join(', ')}`,
        });
      }

      await setConversationAiState({
        conversationId,
        nextState: body.ai_state as (typeof AI_STATES)[number],
        actorType: 'admin',
        actorId: userId,
        reason: 'admin_ai_state_change',
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
