/**
 * GET /instructor/booking-audit-logs — read-only list of booking audit log rows for the authenticated instructor.
 * Used by the Instructor UI "Audit logs" page. Auth: JWT (same as other instructor routes).
 */

import type { FastifyInstance } from 'fastify';
import {
  listInstructorBookingAuditLogs,
  getInstructorProfileByUserId,
  getInstructorProfileDefinitiveByUserId,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) return definitive.id;
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) return legacy.id;
  const e = new Error('Instructor profile not found');
  (e as any).code = ERROR_CODES.NOT_FOUND;
  throw e;
}

export async function instructorBookingAuditLogsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get('/instructor/booking-audit-logs', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const items = await listInstructorBookingAuditLogs(instructorId);
      return reply.send(items);
    } catch (err) {
      const normalized = normalizeError(err);
      return reply
        .status(mapErrorToHttp(normalized.error))
        .send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
