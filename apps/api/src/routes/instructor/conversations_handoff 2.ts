/**
 * Loop 5: Manual handoff & referrals. No auto-assign, no AI.
 * GET /instructor/referrals — list trusted peers
 * POST /instructor/conversations/:id/handoff — hand off conversation to a referred instructor
 */

import type { FastifyInstance } from 'fastify';
import {
  listReferralsForInstructor,
  isReferredInstructor,
  recordHandoff,
  getInstructorProfileByUserId,
  ConversationNotFoundError,
  HandoffNotOwnerError,
  HandoffConflictError,
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

export async function instructorConversationsHandoffRoutes(
  app: FastifyInstance
): Promise<void> {
  // GET /instructor/referrals
  app.get('/instructor/referrals', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const referrals = await listReferralsForInstructor(instructorId);
      return reply.send({ referrals });
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/conversations/:id/handoff
  app.post<{
    Params: { id: string };
    Body: { to_instructor_id?: string; reason?: string };
  }>('/instructor/conversations/:id/handoff', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const conversationId = (request.params as { id: string }).id;
      const body = request.body as { to_instructor_id?: string; reason?: string };

      if (!body?.to_instructor_id || typeof body.to_instructor_id !== 'string' || !body.to_instructor_id.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'to_instructor_id is required',
        });
      }

      const toInstructorId = body.to_instructor_id.trim();
      if (toInstructorId === instructorId) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'to_instructor_id must be different from current owner',
        });
      }

      const isReferral = await isReferredInstructor(instructorId, toInstructorId);
      if (!isReferral) {
        return reply.status(403).send({
          ok: false,
          error: ERROR_CODES.HANDOFF_TARGET_NOT_REFERRED,
          message: 'Target instructor is not in your referrals',
        });
      }

      const result = await recordHandoff({
        conversationId,
        fromInstructorId: instructorId,
        toInstructorId,
        reason: typeof body.reason === 'string' ? body.reason.trim() || null : null,
        createdBy: instructorId,
      });

      return reply.send(result);
    } catch (err) {
      if (err instanceof ConversationNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.CONVERSATION_NOT_FOUND,
          message: err.message,
        });
      }
      if (err instanceof HandoffNotOwnerError) {
        return reply.status(403).send({
          ok: false,
          error: ERROR_CODES.HANDOFF_NOT_OWNER,
          message: err.message,
        });
      }
      if (err instanceof HandoffConflictError) {
        return reply.status(409).send({
          ok: false,
          error: ERROR_CODES.HANDOFF_CONFLICT,
          message: err.message,
        });
      }
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
