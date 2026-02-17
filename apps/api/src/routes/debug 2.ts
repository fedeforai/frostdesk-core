import type { FastifyInstance } from 'fastify';

function maskHost(host: string) {
  if (!host) return '';
  if (host.length <= 12) return host;
  return host.slice(0, 12) + '***';
}

function extractDbHost(databaseUrl?: string) {
  if (!databaseUrl) return '';
  try {
    const u = new URL(databaseUrl);
    if (u.hostname) return u.hostname;
  } catch {
    // URL may not parse postgresql:// in some environments
  }
  const m = databaseUrl.match(/@([^/:\s]+)/);
  return m ? m[1] : '';
}

export async function debugRoutes(app: FastifyInstance) {
  app.get('/debug/info', async (_req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(404).send({ ok: false, error: 'NOT_FOUND' });
    }

    const host = extractDbHost(process.env.DATABASE_URL);
    return reply.send({
      ok: true,
      nodeEnv: process.env.NODE_ENV,
      databaseHost: maskHost(host),
      dbHost: maskHost(host), // alias for convenience
    });
  });
}
