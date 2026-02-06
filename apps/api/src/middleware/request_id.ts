import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

/**
 * Registers request_id propagation for every request.
 * - If x-request-id header is present, use it.
 * - Otherwise generate a UUID.
 * - Assigns to request.id and request.raw.headers so audit and logs can use it.
 */
export async function registerRequestId(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const incoming = request.headers[HEADER];
    const id =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : randomUUID();

    (request as any).id = id;
    (request.raw as any).headers[HEADER] = id;
    request.headers[HEADER] = id;
  });
}
