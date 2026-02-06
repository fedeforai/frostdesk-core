import type { FastifyInstance } from 'fastify';
import { verifyInstructorWhatsappAccount, insertAuditEvent } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
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
      const userId = await requireAdminUser(request);

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

      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId,
          action: 'verify_instructor_whatsapp',
          entity_type: 'whatsapp_account',
          entity_id: account.instructor_id,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: { status: account.status },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (verify instructor WhatsApp)');
      }

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
