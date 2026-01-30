import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorServices, createInstructorService, updateInstructorService } from '@frostdesk/db';
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

type PatchServiceBody = {
  discipline?: string;
  duration_minutes?: number;
  price_amount?: number;
  currency?: string;
  notes?: string | null;
  is_active?: boolean;
};

function getPatchServiceBody(body: unknown): PatchServiceBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: PatchServiceBody = {};
  if (typeof b.discipline === 'string') out.discipline = b.discipline;
  if (typeof b.duration_minutes === 'number') out.duration_minutes = b.duration_minutes;
  if (typeof b.price_amount === 'number') out.price_amount = b.price_amount;
  if (typeof b.currency === 'string') out.currency = b.currency;
  if (b.notes === undefined || b.notes === null || typeof b.notes === 'string') out.notes = b.notes as string | null;
  if (typeof b.is_active === 'boolean') out.is_active = b.is_active;
  return out;
}

function hasAtLeastOnePatchField(patch: PatchServiceBody): boolean {
  return (
    patch.discipline !== undefined ||
    patch.duration_minutes !== undefined ||
    patch.price_amount !== undefined ||
    patch.currency !== undefined ||
    patch.notes !== undefined ||
    patch.is_active !== undefined
  );
}

/**
 * Instructor services routes.
 * GET /instructor/services — list instructor's services (onboarding gate).
 * POST /instructor/services — create service (onboarding gate).
 * PATCH /instructor/services/:id — update service (onboarding gate).
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

  app.patch('/instructor/services/:id', async (request, reply) => {
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
          message: 'Onboarding must be completed to update services',
        });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing service id',
        });
      }

      const patch = getPatchServiceBody(request.body);
      if (patch === null || !hasAtLeastOnePatchField(patch)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: at least one of discipline, duration_minutes, price_amount, currency, notes, is_active required',
        });
      }

      const services = await getInstructorServices(profile.id);
      const existing = services.find((s) => s.id === id);
      if (!existing) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Service not found',
        });
      }

      const service = await updateInstructorService({
        serviceId: id,
        instructorId: profile.id,
        discipline: patch.discipline ?? existing.discipline,
        duration_minutes: patch.duration_minutes ?? existing.duration_minutes,
        price_amount: patch.price_amount ?? existing.price_amount,
        currency: patch.currency ?? existing.currency,
        notes: patch.notes !== undefined ? patch.notes : existing.notes,
        is_active: patch.is_active ?? existing.is_active,
      });

      return reply.send({
        ok: true,
        service,
      });
    } catch (error) {
      if (error instanceof Error && error.message?.includes('Instructor service not found')) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Service not found',
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
