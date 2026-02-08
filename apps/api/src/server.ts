import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';
import { inboundRoutes } from './routes/inbound.js';
import { webhookRoutes } from './routes/webhook.js';
import { webhookWhatsAppRoutes } from './routes/webhook_whatsapp.js';
import { adminRoutes } from './routes/admin.js';
import { instructorRoutes } from './routes/instructor.js';
import { registerRateLimit } from './middleware/rate_limit.js';
import { registerErrorHandler } from './middleware/error_handler.js';
import { registerRequestId } from './middleware/request_id.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
    requestIdLogLabel: 'request_id',
  });

  // Register error handler first (catches all errors)
  await registerErrorHandler(fastify);

  // Register rate limiting middleware before routes
  await registerRateLimit(fastify);

  // Request ID propagation (x-request-id or generated UUID) for audit and tracing
  await registerRequestId(fastify);

  await fastify.register(healthRoutes);
  await fastify.register(inboundRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(webhookWhatsAppRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(instructorRoutes);

  return fastify;
}
