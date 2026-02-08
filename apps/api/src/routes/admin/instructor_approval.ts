import { FastifyInstance } from 'fastify';
import {
  listPendingInstructors,
  setInstructorApprovalStatus,
  insertAuditEvent,
} from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function adminInstructorApprovalRoutes(app: FastifyInstance) {
  app.get('/admin/instructors/pending', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const items = await listPendingInstructors();
      return reply.send({ ok: true, items });
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });

  app.post<{
    Params: { id: string };
    Body: { status?: 'approved' | 'rejected' };
  }>('/admin/instructors/:id/approve', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const instructorId = (request.params as { id: string }).id;
      const body = request.body ?? {};
      const status = body.status ?? 'approved';

      if (!instructorId || typeof instructorId !== 'string' || instructorId.trim().length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'Instructor id required',
        });
      }

      if (status !== 'approved' && status !== 'rejected') {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'status must be approved or rejected',
        });
      }

      const updated = await setInstructorApprovalStatus(instructorId.trim(), status);
      if (!updated) {
        const normalized = normalizeError({ code: ERROR_CODES.NOT_FOUND });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'Instructor not found',
        });
      }

      try {
        await insertAuditEvent({
          actor_type: 'admin',
          actor_id: userId,
          action: 'instructor_approval_status_changed',
          entity_type: 'instructor',
          entity_id: instructorId,
          request_id: (request as any).id ?? null,
          ip: request.ip ?? null,
          user_agent: request.headers['user-agent'] ?? null,
          payload: { status },
        });
      } catch (auditErr) {
        request.log.error({ err: auditErr }, 'Audit write failed (instructor_approval_status_changed)');
      }

      return reply.send({ ok: true, instructor: updated });
    } catch (error) {
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
