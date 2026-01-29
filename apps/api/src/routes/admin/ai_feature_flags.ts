/**
 * Temporarily disabled for pilot. Feature flags are not required for manual WhatsApp pilot.
 * 
 * This route is commented out to unblock API startup.
 * It will be re-enabled when AI feature flags are needed.
 */

/*
import { FastifyInstance } from 'fastify';
import { isFeatureEnabled } from '@frostdesk/db/src/feature_flag_repository.js';
import { isAIEnvDisabled } from '@frostdesk/db/src/ai_env_kill_switch.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminAIFeatureFlagsRoutes(app: FastifyInstance) {
  const getUserId = (request: any): string => {
    const userId = (request.headers['x-user-id'] as string) || (request.query as any)?.userId;
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID required');
    }
    return userId;
  };

  app.get('/admin/ai-feature-flags', async (request, reply) => {
    try {
      getUserId(request);

      const envDisabled = isAIEnvDisabled();
      const aiEnabled = await isFeatureEnabled('ai_enabled');
      const aiWhatsAppEnabled = await isFeatureEnabled('ai_whatsapp_enabled');

      return reply.send({
        ok: true,
        flags: {
          ai_enabled: aiEnabled,
          ai_whatsapp_enabled: aiWhatsAppEnabled,
        },
        emergency_disabled: envDisabled,
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
*/