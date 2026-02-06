/**
 * Temporarily disabled for pilot. Feature flags are not required for manual WhatsApp pilot.
 * 
 * This route is commented out to unblock API startup.
 * It will be re-enabled when AI feature flags are needed.
 * When re-enabled, uses requireAdminUser (JWT + DB admin check).
 */

/*
import { FastifyInstance } from 'fastify';
import { isFeatureEnabled, isAIEnvDisabled } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

export async function adminAIFeatureFlagsRoutes(app: FastifyInstance) {
  app.get('/admin/ai-feature-flags', async (request, reply) => {
    try {
      await requireAdminUser(request);

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