import type { FastifyInstance } from 'fastify';
import { getFeatureFlag, setFeatureFlag, getInstructorProfileByUserId } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type Env = 'dev' | 'staging' | 'prod';

function getEnv(): Env {
  const v = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
  if (v === 'staging' || v === 'prod') return v;
  return 'dev';
}

/**
 * Instructor-scoped read/update of global AI feature flag (ai_enabled).
 * GET  /instructor/ai-status — returns { enabled, canToggle }
 * PATCH /instructor/ai-status — body { enabled: boolean }, sets flag if canToggle
 */
export async function instructorAIFeatureStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/ai-status', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile?.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding required to view AI status',
        });
      }
      const env = getEnv();
      const [enabled, aiWhatsAppEnabled] = await Promise.all([
        getFeatureFlag('ai_enabled', env),
        getFeatureFlag('ai_whatsapp_enabled', env),
      ]);
      const canToggle = true; // could be gated by pilot list or role later
      return reply.send({ ok: true, enabled, canToggle, ai_whatsapp_enabled: aiWhatsAppEnabled });
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

  app.patch('/instructor/ai-status', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);
      if (!profile?.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding required to change AI status',
        });
      }
      const body = request.body as { enabled?: boolean };
      if (typeof body?.enabled !== 'boolean') {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'Body must include { enabled: boolean }',
        });
      }
      const result = await setFeatureFlag('ai_enabled', body.enabled);
      return reply.send({ ok: true, enabled: result.enabled });
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
