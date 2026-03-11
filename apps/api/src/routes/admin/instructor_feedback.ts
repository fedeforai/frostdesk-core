import type { FastifyInstance } from 'fastify';
import {
  getAdminInstructorById,
  listInstructorFeedbackByInstructorId,
  updateInstructorFeedback,
} from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function adminInstructorFeedbackRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/admin/instructors/:id', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const instructorId = (request.params as { id: string }).id?.trim();
      if (!instructorId) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'Instructor id required',
        });
      }
      const instructor = await getAdminInstructorById(instructorId);
      if (!instructor) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor not found',
        });
      }
      return reply.send({ ok: true, instructor });
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

  app.get<{ Params: { id: string } }>('/admin/instructors/:id/feedback', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const instructorId = (request.params as { id: string }).id?.trim();
      if (!instructorId) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'Instructor id required',
        });
      }
      const instructor = await getAdminInstructorById(instructorId);
      if (!instructor) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor not found',
        });
      }
      const items = await listInstructorFeedbackByInstructorId(instructorId);
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

  app.patch<{
    Params: { id: string };
    Body: { read_at?: string | null; admin_notes?: string | null };
  }>('/admin/instructor-feedback/:id', async (request, reply) => {
    try {
      await requireAdminUser(request);
      const feedbackId = (request.params as { id: string }).id?.trim();
      if (!feedbackId) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'Feedback id required',
        });
      }
      const body = (request.body ?? {}) as { read_at?: string | null; admin_notes?: string | null };
      const updated = await updateInstructorFeedback(feedbackId, {
        read_at: body.read_at,
        admin_notes: body.admin_notes,
      });
      if (!updated) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Feedback not found',
        });
      }
      return reply.send({ ok: true });
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
