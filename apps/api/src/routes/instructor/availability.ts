import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorAvailability,
  createInstructorAvailability,
  updateInstructorAvailability,
  findInstructorAvailabilityBySlot,
  toggleInstructorAvailability,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type PostAvailabilityBody = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

function isValidPostBody(body: unknown): body is PostAvailabilityBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.day_of_week === 'number' &&
    Number.isInteger(b.day_of_week) &&
    b.day_of_week >= 0 &&
    b.day_of_week <= 6 &&
    typeof b.start_time === 'string' &&
    typeof b.end_time === 'string' &&
    typeof b.is_active === 'boolean'
  );
}

function startBeforeEnd(start: string, end: string): boolean {
  return start < end;
}

function toApiAvailability(row: {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}) {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    is_active: row.is_active,
  };
}

/**
 * Instructor availability routes.
 * GET /instructor/availability — list all (onboarding gate).
 * POST /instructor/availability — upsert by day+start+end (onboarding gate).
 * PATCH /instructor/availability/:id/toggle — invert is_active (onboarding gate).
 * Auth: JWT. No admin, no debug bypass.
 */
export async function instructorAvailabilityRoutes(app: FastifyInstance): Promise<void> {
  async function requireOnboarded(userId: string) {
    const profile = await getInstructorProfileByUserId(userId);
    if (!profile) return { code: 'NOT_FOUND' as const, profile: null };
    if (!profile.onboarding_completed_at) return { code: 'ONBOARDING_REQUIRED' as const, profile: null };
    return { code: 'OK' as const, profile };
  }

  app.get('/instructor/availability', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const { code, profile } = await requireOnboarded(userId);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access availability',
        });
      }
      const list = await getInstructorAvailability(profile!.id);
      return reply.send({
        ok: true,
        availability: list.map(toApiAvailability),
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

  app.post('/instructor/availability', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const { code, profile } = await requireOnboarded(userId);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access availability',
        });
      }
      const body = request.body;
      if (!isValidPostBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: day_of_week (0-6), start_time, end_time (strings), is_active (boolean) required',
        });
      }
      if (!startBeforeEnd(body.start_time, body.end_time)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'start_time must be before end_time',
        });
      }
      const instructorId = profile!.id;
      const existing = await findInstructorAvailabilityBySlot(
        instructorId,
        body.day_of_week,
        body.start_time,
        body.end_time
      );
      let row;
      if (existing) {
        row = await updateInstructorAvailability({
          id: existing.id,
          instructorId,
          dayOfWeek: existing.day_of_week,
          startTime: existing.start_time,
          endTime: existing.end_time,
          isActive: body.is_active,
        });
      } else {
        row = await createInstructorAvailability({
          instructorId,
          dayOfWeek: body.day_of_week,
          startTime: body.start_time,
          endTime: body.end_time,
          isActive: body.is_active,
        });
      }
      return reply.send({
        ok: true,
        availability: toApiAvailability(row),
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

  app.patch('/instructor/availability/:id/toggle', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const { code, profile } = await requireOnboarded(userId);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access availability',
        });
      }
      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing availability id',
        });
      }
      const row = await toggleInstructorAvailability(id, profile!.id);
      return reply.send({
        ok: true,
        availability: toApiAvailability(row),
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
}
