import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';
import { inboundRoutes } from './routes/inbound.js';
import { webhookRoutes } from './routes/webhook.js';
import { webhookWhatsAppRoutes } from './routes/webhook_whatsapp.js';
import { webhookStripeRoutes } from './routes/webhook_stripe.js';
import { webhookStripeSubscriptionRoutes } from './routes/webhook_stripe_subscription.js';
import { adminRoutes } from './routes/admin.js';
import { instructorRoutes } from './routes/instructor.js';
import { registerRateLimit } from './middleware/rate_limit.js';
import { registerErrorHandler } from './middleware/error_handler.js';
import { registerRequestId } from './middleware/request_id.js';
import { logRequest } from './lib/logger.js';

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

  // Loop A: Structured request logging (onResponse hook)
  fastify.addHook('onResponse', (request, reply, done) => {
    try {
      logRequest({
        request_id: (request as any).id ?? '',
        route: request.routeOptions?.url ?? request.url,
        method: request.method,
        instructor_id: (request as any).instructorId ?? null,
        latency_ms: Math.round(reply.elapsedTime),
        status_code: reply.statusCode,
        error_code: reply.statusCode >= 400 ? `HTTP_${reply.statusCode}` : null,
      });
    } catch { /* logger must never throw */ }
    done();
  });

  await fastify.register(healthRoutes);
  await fastify.register(inboundRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(webhookWhatsAppRoutes);
  await fastify.register(webhookStripeRoutes);
  await fastify.register(webhookStripeSubscriptionRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(instructorRoutes);

  // Se qualcuno apre l'API (3001) su path /admin/* vede un messaggio chiaro invece di pagina bianca
  fastify.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0];
    const accept = (request.headers.accept ?? '').toLowerCase();
    if (path.startsWith('/admin') && (accept.includes('text/html') || accept.includes('*/*'))) {
      reply.type('text/html').status(404).send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>API</title></head><body style="font-family:sans-serif;padding:2rem;max-width:32rem;margin:0 auto;"><h1>Questa è l'API (porta 3001)</h1><p>L'interfaccia admin è su un'altra porta.</p><p><strong>Apri <a href="http://localhost:3000">http://localhost:3000</a></strong> per il login admin e la dashboard.</p><p>Login: <a href="http://localhost:3000/login">http://localhost:3000/login</a></p></body></html>`
      );
      return;
    }
    reply.status(404).send({ ok: false, error: 'NOT_FOUND' });
  });

  return fastify;
}
