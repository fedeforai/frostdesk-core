/**
 * GET /instructor/ai-booking-suggestion-context
 * Read-only context for AI booking suggestions: availability, busySlots, recentBookings.
 * Replaces Supabase Edge dependency so the instructor app works with Fastify only.
 */

import type { FastifyInstance } from 'fastify';
import { getAIBookingSuggestionContext, getInstructorProfileByUserId, getInstructorProfileDefinitiveByUserId } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) return definitive.id;
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) return legacy.id;
  const e = new Error('Instructor profile not found');
  (e as any).code = ERROR_CODES.NOT_FOUND;
  throw e;
}

export async function instructorAIBookingSuggestionContextRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/ai-booking-suggestion-context', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const context = await getAIBookingSuggestionContext(instructorId);
      return reply.send(context);
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
