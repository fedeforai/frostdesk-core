import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileDefinitiveByUserId,
  getInstructorProfileByUserId,
  insertInstructorFeedback,
  listInstructorFeedbackByInstructorId,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function resolveInstructorId(userId: string): Promise<string | null> {
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) return definitive.id;
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) return legacy.id;
  return null;
}

export async function instructorFeedbackRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { message?: string } }>('/instructor/feedback', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const instructorId = await resolveInstructorId(userId);
      if (!instructorId) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const body = (request.body ?? {}) as { message?: string };
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'message is required',
        });
      }
      const result = await insertInstructorFeedback(instructorId, message);
      return reply.status(201).send({
        ok: true,
        id: result.id,
        created_at: result.created_at,
      });
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

  app.get('/instructor/feedback', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const instructorId = await resolveInstructorId(userId);
      if (!instructorId) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const rows = await listInstructorFeedbackByInstructorId(instructorId);
      const items = rows.map((r) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at,
      }));
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
}
