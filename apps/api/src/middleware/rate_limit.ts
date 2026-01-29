import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { getFeatureFlag } from '@frostdesk/db';

/**
 * Registers rate limiting middleware if feature flag is enabled.
 * 
 * WHAT IT DOES:
 * - Checks `rate_limit_enabled` feature flag ONCE at server startup
 * - If flag is disabled or missing → middleware is NO-OP (no rate limiting)
 * - If flag is enabled → applies rate limit: 60 requests per minute per IP
 * - Rate limiting runs BEFORE auth, admin guard, and routing
 * - Returns HTTP 429 with { ok: false, error: "RATE_LIMIT_EXCEEDED" } when limit exceeded
 * 
 * WHAT IT DOES NOT DO:
 * - No admin guard (infrastructure-level, pre-auth)
 * - No per-request feature flag checks (checked once at startup)
 * - No environment-specific limits (fixed 60 req/min for MVP)
 * - No mutations or side effects
 * - No logging of rate limit events
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  // Resolve environment from NODE_ENV
  // Maps: production → 'prod', staging → 'staging', default → 'dev'
  const nodeEnv = process.env.NODE_ENV;
  const env = nodeEnv === 'production' ? 'prod' : nodeEnv === 'staging' ? 'staging' : 'dev';

  try {
    // Check feature flag ONCE at startup
    const enabled = await getFeatureFlag('rate_limit_enabled', env);

    if (!enabled) {
      // NO-OP: flag disabled or missing, skip rate limiting
      return;
    }

    // Register rate limit plugin with MVP config: 60 requests per minute per IP
    await app.register(rateLimit, {
      timeWindow: 60_000, // 1 minute in milliseconds
      max: 60, // 60 requests per window
      keyGenerator: (req: any) => req.ip, // Per IP address
      errorResponseBuilder: (request, context) => {
        // Return HTTP 429 with specified error format
        return {
          statusCode: 429,
          ok: false,
          error: 'RATE_LIMIT_EXCEEDED',
        };
      },
    });
  } catch (error) {
    // Fail closed: if flag check fails, don't apply rate limit (safer default)
    // No logging to avoid side effects
  }
}
