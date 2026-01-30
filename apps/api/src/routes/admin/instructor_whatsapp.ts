import type { FastifyInstance } from 'fastify';
import { assertAdminAccess, verifyInstructorWhatsappAccount } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Admin instructor WhatsApp routes (manual verify only).
 * POST /admin/instructor/whatsapp/verify — set instructor WhatsApp account to verified (admin-only).
 * No webhook, no Meta API, no inbox logic — state only.
 */
export async function adminInstructorWhatsappRoutes(app: FastifyInstance): Promise<void> {
  app.post('/admin/instructor/whatsapp/verify', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      await assertAdminAccess(userId);

      const body = request.body as { instructor_id?: string };
      const instructor_id = body?.instructor_id;
      if (!instructor_id || typeof instructor_id !== 'string' || instructor_id.trim().length === 0) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'instructor_id (UUID) required',
        });
      }

      const account = await verifyInstructorWhatsappAccount(instructor_id.trim());

      return reply.send({
        ok: true,
        account: {
          instructor_id: account.instructor_id,
          phone_number: account.phone_number,
          status: account.status,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSTRUCTOR_WHATSAPP_NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor WhatsApp account not found',
        });
      }
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
