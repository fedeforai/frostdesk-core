import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorAvailability,
  upsertInstructorAvailability,
  toggleInstructorAvailability,
  listAvailabilityCalendarConflicts,
  listAvailabilityOverridesInRange,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
  InstructorAvailabilityNotFoundError,
  validateAvailability,
  AvailabilityConflictError,
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
  meeting_point_id?: string | null;
};

function isValidPostBody(body: unknown): body is PostAvailabilityBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  const valid =
    typeof b.day_of_week === 'number' &&
    Number.isInteger(b.day_of_week) &&
    b.day_of_week >= 0 &&
    b.day_of_week <= 6 &&
    typeof b.start_time === 'string' &&
    typeof b.end_time === 'string' &&
    typeof b.is_active === 'boolean';
  if (!valid) return false;
  if (b.meeting_point_id !== undefined && b.meeting_point_id !== null && typeof b.meeting_point_id !== 'string') return false;
  return true;
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
  meeting_point_id?: string | null;
}) {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    is_active: row.is_active,
    meeting_point_id: row.meeting_point_id ?? null,
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

  // GET /instructor/availability/overrides — list date-specific overrides in range
  app.get<{ Querystring: { from?: string; to?: string } }>('/instructor/availability/overrides', async (request, reply) => {
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
      const now = new Date();
      const from = request.query?.from ?? now.toISOString();
      const toQuery = request.query?.to;
      const to = toQuery ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const items = await listAvailabilityOverridesInRange(profile!.id, from, to);
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

  // POST /instructor/availability/overrides — create override (block or add window)
  app.post<{ Body: { start_utc: string; end_utc: string; is_available: boolean } }>('/instructor/availability/overrides', async (request, reply) => {
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
      if (!body || typeof body.start_utc !== 'string' || typeof body.end_utc !== 'string' || typeof body.is_available !== 'boolean') {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Body must include start_utc, end_utc (ISO strings), is_available (boolean). is_available false = block, true = add window.',
        });
      }
      const start = new Date(body.start_utc).getTime();
      const end = new Date(body.end_utc).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_TIME_RANGE },
          message: 'start_utc must be before end_utc',
        });
      }
      const row = await createAvailabilityOverride({
        instructor_id: profile!.id,
        start_utc: body.start_utc,
        end_utc: body.end_utc,
        is_available: body.is_available,
      });
      return reply.status(201).send({ ok: true, item: row });
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

  // DELETE /instructor/availability/overrides/:id
  app.delete<{ Params: { id: string } }>('/instructor/availability/overrides/:id', async (request, reply) => {
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
      const { id } = request.params;
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing override id',
        });
      }
      await deleteAvailabilityOverride(id, profile!.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Override not found',
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

  // GET /instructor/availability/check — check if a time window has conflicts (for confirm-draft flow)
  // Query: date=YYYY-MM-DD, start_time=HH:mm, duration_minutes=120; or start_utc & end_utc (ISO). Date+time interpreted as UTC.
  // Returns 200 { hasConflict: boolean, conflicts?: CalendarConflictDto[] }. 401/403 when not authenticated.
  app.get<{
    Querystring: {
      date?: string;
      start_time?: string;
      duration_minutes?: string;
      start_utc?: string;
      end_utc?: string;
    };
  }>('/instructor/availability/check', async (request, reply) => {
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
          message: 'Onboarding must be completed to check availability',
        });
      }
      const q = request.query;
      let startUtc: string;
      let endUtc: string;
      if (typeof q.start_utc === 'string' && typeof q.end_utc === 'string') {
        startUtc = q.start_utc;
        endUtc = q.end_utc;
      } else if (
        typeof q.date === 'string' &&
        typeof q.start_time === 'string' &&
        typeof q.duration_minutes === 'string'
      ) {
        const date = q.date.trim();
        const startTime = q.start_time.trim();
        const durationMinutes = parseInt(q.duration_minutes, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(startTime) || !Number.isInteger(durationMinutes) || durationMinutes < 1) {
          return reply.status(400).send({
            ok: false,
            error: { code: ERROR_CODES.INVALID_PAYLOAD },
            message: 'Query must include date (YYYY-MM-DD), start_time (HH:mm), duration_minutes (positive integer), or start_utc and end_utc (ISO).',
          });
        }
        const paddedTime = startTime.length === 4 ? `0${startTime}` : startTime;
        const startDate = new Date(`${date}T${paddedTime}:00.000Z`);
        if (isNaN(startDate.getTime())) {
          return reply.status(400).send({
            ok: false,
            error: { code: ERROR_CODES.INVALID_PAYLOAD },
            message: 'Invalid date or time; use YYYY-MM-DD and HH:mm.',
          });
        }
        startUtc = startDate.toISOString();
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        endUtc = endDate.toISOString();
      } else {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Query must include date, start_time, duration_minutes, or start_utc and end_utc.',
        });
      }
      const start = new Date(startUtc).getTime();
      const end = new Date(endUtc).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_TIME_RANGE },
          message: 'start_utc must be before end_utc.',
        });
      }
      try {
        await validateAvailability({
          instructorId: profile!.id,
          startUtc,
          endUtc,
        });
        return reply.send({ ok: true, hasConflict: false });
      } catch (err) {
        if (err instanceof AvailabilityConflictError) {
          return reply.send({
            ok: true,
            hasConflict: true,
            conflicts: err.conflicts,
          });
        }
        // Calendar unavailable or other error: do not block confirm; signal unknown
        return reply.send({
          ok: true,
          hasConflict: false,
          availabilityUnknown: true,
        });
      }
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

  // GET /instructor/availability/conflicts — list availability vs calendar conflicts (must be before /instructor/availability)
  app.get('/instructor/availability/conflicts', async (request, reply) => {
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
          message: 'Onboarding must be completed to view conflicts',
        });
      }
      const items = await listAvailabilityCalendarConflicts(profile!.id);
      return reply.send({ ok: true, items });
    } catch (error) {
      // Always return 200 + empty list so the Conflicts page loads; log error for debugging
      request.log?.warn?.({ err: error }, 'availability/conflicts: error, returning empty list');
      return reply.send({ ok: true, items: [] });
    }
  });

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
          error: { code: ERROR_CODES.INVALID_TIME_RANGE },
          message: 'start_time must be before end_time',
        });
      }
      const row = await upsertInstructorAvailability({
        instructor_id: profile!.id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        is_active: body.is_active,
        meeting_point_id: body.meeting_point_id ?? null,
      });
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
      if (error instanceof InstructorAvailabilityNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Availability not found',
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
