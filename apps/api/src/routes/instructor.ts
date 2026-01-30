import type { FastifyInstance } from 'fastify';
import { instructorProfileRoutes } from './instructor/profile.js';
import { instructorAvailabilityRoutes } from './instructor/availability.js';
import { instructorServicesRoutes } from './instructor/services.js';

/**
 * Instructor routes (authenticated by JWT, no admin).
 */
export async function instructorRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(instructorProfileRoutes);
  await fastify.register(instructorAvailabilityRoutes);
  await fastify.register(instructorServicesRoutes);
}
