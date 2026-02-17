import type { FastifyInstance } from 'fastify';
import { setFeatureFlag, getInstructorProfileByUserId, insertAiBehaviorEvent } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * POST /instructor/ai/toggle-whatsapp
 * Body: { enabled: boolean }
 * Updates global AI WhatsApp flag, records who toggled it in ai_behavior_events.
 * Returns: { enabled: boolean }
 */
export async function instructorAIToggleWhatsAppRoutes(app: FastifyInstance): Promise<void> {
  app.post('/instructor/ai/toggle-whatsapp', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile?.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding required',
        });
      }

      const body = request.body as { enabled?: unknown };
      if (typeof body?.enabled !== 'boolean') {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'Body must include { enabled: boolean }',
        });
      }

      const result = await setFeatureFlag('ai_whatsapp_enabled', body.enabled);

      await insertAiBehaviorEvent(profile.id, 'ai_whatsapp_toggled', {
        new_state: body.enabled,
      });

      return reply.send({ enabled: result.enabled });
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
