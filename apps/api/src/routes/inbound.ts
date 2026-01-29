import { FastifyInstance } from 'fastify';
import { ensureValidUUID, insertMessage, getFeatureFlag } from '@frostdesk/db';
import { normalizeError } from '../errors/normalize_error.js';
import { mapErrorToHttp } from '../errors/error_http_map.js';
import { ERROR_CODES } from '../errors/error_codes.js';

export async function inboundRoutes(fastify: FastifyInstance) {
  fastify.post('/inbound', async (request, reply) => {
    try {
      // Feature flag guard: check if WhatsApp inbound is enabled
      // Resolve env from NODE_ENV (dev/staging/prod)
      const nodeEnv = process.env.NODE_ENV;
      const env = nodeEnv === 'production' ? 'prod' : nodeEnv === 'staging' ? 'staging' : 'dev';
      const whatsappInboundEnabled = await getFeatureFlag('whatsapp_inbound_enabled', env);
      if (!whatsappInboundEnabled) {
        const normalized = normalizeError({ code: ERROR_CODES.SERVICE_DISABLED });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const body = request.body as {
        conversation_id?: string | null;
        text: string;
      };

      const { conversation_id, text } = body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_TEXT });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          ...(normalized.message ? { message: normalized.message } : {}),
        });
      }

      const normalized = conversation_id ?? undefined;
      const conversationId = ensureValidUUID(normalized);

      await insertMessage({
        conversation_id: conversationId,
        role: 'user',
        content: text.trim()
      });

      return { ok: true, conversation_id: conversationId };
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
