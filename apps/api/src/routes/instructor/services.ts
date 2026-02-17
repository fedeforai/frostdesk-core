import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorServices, createInstructorService, updateInstructorService } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const LESSON_TYPES = ['private', 'semi_private', 'group'] as const;

type CreateServiceBody = {
  name?: string | null;
  discipline: string;
  lesson_type?: string | null;
  duration_minutes: number;
  min_participants?: number;
  max_participants?: number;
  price_amount: number;
  currency?: string;
  short_description?: string | null;
  location?: string | null;
  notes?: string | null;
  sort_order?: number;
};

function isValidCreateServiceBody(body: unknown): body is CreateServiceBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.discipline === 'string' &&
    typeof b.duration_minutes === 'number' &&
    typeof b.price_amount === 'number' &&
    (b.currency === undefined || typeof b.currency === 'string') &&
    (b.notes === undefined || b.notes === null || typeof b.notes === 'string') &&
    (b.name === undefined || b.name === null || typeof b.name === 'string') &&
    (b.lesson_type === undefined || b.lesson_type === null || (typeof b.lesson_type === 'string' && LESSON_TYPES.includes(b.lesson_type as typeof LESSON_TYPES[number]))) &&
    (b.min_participants === undefined || typeof b.min_participants === 'number') &&
    (b.max_participants === undefined || typeof b.max_participants === 'number') &&
    (b.short_description === undefined || b.short_description === null || typeof b.short_description === 'string') &&
    (b.location === undefined || b.location === null || typeof b.location === 'string') &&
    (b.sort_order === undefined || typeof b.sort_order === 'number')
  );
}

type PatchServiceBody = {
  name?: string | null;
  discipline?: string;
  lesson_type?: string | null;
  duration_minutes?: number;
  min_participants?: number;
  max_participants?: number;
  price_amount?: number;
  currency?: string;
  short_description?: string | null;
  location?: string | null;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

function getPatchServiceBody(body: unknown): PatchServiceBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: PatchServiceBody = {};
  if (b.name === undefined || b.name === null || typeof b.name === 'string') out.name = b.name as string | null;
  if (typeof b.discipline === 'string') out.discipline = b.discipline;
  if (b.lesson_type === undefined || b.lesson_type === null || (typeof b.lesson_type === 'string' && LESSON_TYPES.includes(b.lesson_type as typeof LESSON_TYPES[number]))) out.lesson_type = b.lesson_type as string | null;
  if (typeof b.duration_minutes === 'number') out.duration_minutes = b.duration_minutes;
  if (typeof b.min_participants === 'number') out.min_participants = b.min_participants;
  if (typeof b.max_participants === 'number') out.max_participants = b.max_participants;
  if (typeof b.price_amount === 'number') out.price_amount = b.price_amount;
  if (typeof b.currency === 'string') out.currency = b.currency;
  if (b.short_description === undefined || b.short_description === null || typeof b.short_description === 'string') out.short_description = b.short_description as string | null;
  if (b.location === undefined || b.location === null || typeof b.location === 'string') out.location = b.location as string | null;
  if (b.notes === undefined || b.notes === null || typeof b.notes === 'string') out.notes = b.notes as string | null;
  if (typeof b.is_active === 'boolean') out.is_active = b.is_active;
  if (typeof b.sort_order === 'number') out.sort_order = b.sort_order;
  return out;
}

function hasAtLeastOnePatchField(patch: PatchServiceBody): boolean {
  return (
    patch.name !== undefined ||
    patch.discipline !== undefined ||
    patch.lesson_type !== undefined ||
    patch.duration_minutes !== undefined ||
    patch.min_participants !== undefined ||
    patch.max_participants !== undefined ||
    patch.price_amount !== undefined ||
    patch.currency !== undefined ||
    patch.short_description !== undefined ||
    patch.location !== undefined ||
    patch.notes !== undefined ||
    patch.is_active !== undefined ||
    patch.sort_order !== undefined
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
        name: body.name,
        discipline: body.discipline,
        lesson_type: body.lesson_type ?? 'private',
        duration_minutes: body.duration_minutes,
        min_participants: body.min_participants ?? 1,
        max_participants: body.max_participants ?? 1,
        price_amount: body.price_amount,
        currency: body.currency ?? 'EUR',
        short_description: body.short_description ?? null,
        location: body.location ?? null,
        notes: body.notes ?? null,
        sort_order: body.sort_order ?? 0,
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
          message: 'Invalid body: at least one of name, discipline, lesson_type, duration_minutes, min_participants, max_participants, price_amount, currency, short_description, location, notes, is_active, sort_order required',
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

      const rawLesson = patch.lesson_type ?? existing.lesson_type ?? 'private';
      const lesson_type = LESSON_TYPES.includes(rawLesson as typeof LESSON_TYPES[number]) ? (rawLesson as typeof LESSON_TYPES[number]) : 'private';
      const service = await updateInstructorService({
        serviceId: id,
        instructorId: profile.id,
        name: patch.name !== undefined ? patch.name : (existing.name ?? existing.discipline),
        discipline: patch.discipline ?? existing.discipline,
        lesson_type,
        duration_minutes: patch.duration_minutes ?? existing.duration_minutes,
        min_participants: patch.min_participants ?? existing.min_participants ?? 1,
        max_participants: patch.max_participants ?? existing.max_participants ?? 1,
        price_amount: patch.price_amount ?? existing.price_amount,
        currency: patch.currency ?? existing.currency,
        short_description: patch.short_description !== undefined ? patch.short_description : (existing.short_description ?? null),
        location: patch.location !== undefined ? patch.location : (existing.location ?? null),
        notes: patch.notes !== undefined ? patch.notes : (existing.notes ?? null),
        is_active: patch.is_active ?? existing.is_active,
        sort_order: patch.sort_order ?? existing.sort_order ?? 0,
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
