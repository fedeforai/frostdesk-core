import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
  });

  // Register routes
  await fastify.register(healthRoutes);

  return fastify;
}
