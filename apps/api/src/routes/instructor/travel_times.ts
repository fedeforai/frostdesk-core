import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getTravelTimes,
  getDefaultTravelTime,
  upsertTravelTime,
  setDefaultTravelBuffer,
  deleteTravelTime,
  TravelTimeNotFoundError,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type UpsertTravelTimeBody = {
  from_meeting_point_id?: string | null;
  to_meeting_point_id?: string | null;
  travel_minutes: number;
  is_default?: boolean;
};

type SetDefaultBufferBody = {
  travel_minutes: number;
};

function isValidUpsertTravelTimeBody(body: unknown): body is UpsertTravelTimeBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.travel_minutes === 'number' &&
    b.travel_minutes >= 0 &&
    (b.from_meeting_point_id === undefined || b.from_meeting_point_id === null || typeof b.from_meeting_point_id === 'string') &&
    (b.to_meeting_point_id === undefined || b.to_meeting_point_id === null || typeof b.to_meeting_point_id === 'string') &&
    (b.is_default === undefined || typeof b.is_default === 'boolean')
  );
}

function isValidSetDefaultBufferBody(body: unknown): body is SetDefaultBufferBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.travel_minutes === 'number' && b.travel_minutes >= 0;
}

/**
 * Instructor travel times routes.
 * GET /instructor/travel-times — list all travel times
 * GET /instructor/travel-times/default — get default travel buffer
 * POST /instructor/travel-times — upsert travel time
 * POST /instructor/travel-times/default — set default buffer
 * DELETE /instructor/travel-times/:id — delete travel time
 */
export async function instructorTravelTimesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/travel-times', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access travel times',
        });
      }

      const travelTimes = await getTravelTimes(profile.id);
      return reply.send({ ok: true, travel_times: travelTimes });
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

  app.get('/instructor/travel-times/default', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access travel times',
        });
      }

      const defaultTime = await getDefaultTravelTime(profile.id);
      return reply.send({
        ok: true,
        default_travel_time: defaultTime,
        default_minutes: defaultTime?.travel_minutes ?? 0,
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

  app.post('/instructor/travel-times', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to create travel times',
        });
      }

      const body = request.body;
      if (!isValidUpsertTravelTimeBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: travel_minutes (non-negative number) required',
        });
      }

      const travelTime = await upsertTravelTime({
        instructorId: profile.id,
        fromMeetingPointId: body.from_meeting_point_id ?? null,
        toMeetingPointId: body.to_meeting_point_id ?? null,
        travelMinutes: body.travel_minutes,
        isDefault: body.is_default ?? false,
      });

      return reply.status(201).send({ ok: true, travel_time: travelTime });
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

  app.post('/instructor/travel-times/default', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to set default travel buffer',
        });
      }

      const body = request.body;
      if (!isValidSetDefaultBufferBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: travel_minutes (non-negative number) required',
        });
      }

      const travelTime = await setDefaultTravelBuffer(profile.id, body.travel_minutes);
      return reply.send({ ok: true, travel_time: travelTime });
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

  app.delete('/instructor/travel-times/:id', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const profile = await getInstructorProfileByUserId(userId);

      if (!profile) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }

      if (!profile.onboarding_completed_at) {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to delete travel times',
        });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing travel time id',
        });
      }

      await deleteTravelTime(id, profile.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof TravelTimeNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Travel time not found',
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
