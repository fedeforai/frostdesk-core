import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorServices, createInstructorService } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type CreateServiceBody = {
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency?: string;
  notes?: string;
};

function isValidCreateServiceBody(body: unknown): body is CreateServiceBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.discipline === 'string' &&
    typeof b.duration_minutes === 'number' &&
    typeof b.price_amount === 'number' &&
    (b.currency === undefined || typeof b.currency === 'string') &&
    (b.notes === undefined || typeof b.notes === 'string')
  );
}

/**
 * Instructor services routes.
 * GET /instructor/services — list instructor's services (onboarding gate).
 * POST /instructor/services — create service (onboarding gate).
 * Auth: JWT. No admin, no debug bypass.
 */
export async function instructorServicesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/services', async (request, reply) => {
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
          message: 'Onboarding must be completed to access services',
        });
      }

      const services = await getInstructorServices(profile.id);
      return reply.send({
        ok: true,
        services,
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

  app.post('/instructor/services', async (request, reply) => {
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
          message: 'Onboarding must be completed to create services',
        });
      }

      const body = request.body;
      if (!isValidCreateServiceBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: discipline (string), duration_minutes (number), price_amount (number) required',
        });
      }

      const service = await createInstructorService({
        instructorId: profile.id,
        discipline: body.discipline,
        duration_minutes: body.duration_minutes,
        price_amount: body.price_amount,
        currency: body.currency ?? 'EUR',
        notes: body.notes ?? null,
      });

      return reply.status(201).send({
        ok: true,
        service,
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
