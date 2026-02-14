/**
 * Instructor meeting points: list, create, update.
 * Auth: JWT. Ownership by instructor_id from profile. Onboarding gate.
 */

import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  listInstructorMeetingPoints,
  createInstructorMeetingPoint,
  updateInstructorMeetingPoint,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type CreateBody = {
  name: string;
  description?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default: boolean;
};

function isValidCreateBody(body: unknown): body is CreateBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.name === 'string' && typeof b.is_default === 'boolean';
}

type PatchBody = {
  name?: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default?: boolean;
  is_active?: boolean;
};

function getPatchBody(body: unknown): PatchBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: PatchBody = {};
  if (typeof b.name === 'string') out.name = b.name;
  if (b.description === undefined || b.description === null || typeof b.description === 'string') out.description = b.description as string | null;
  if (b.address === undefined || b.address === null || typeof b.address === 'string') out.address = b.address as string | null;
  if (typeof b.latitude === 'number' || b.latitude === null) out.latitude = b.latitude;
  if (typeof b.longitude === 'number' || b.longitude === null) out.longitude = b.longitude;
  if (b.what3words === undefined || b.what3words === null || typeof b.what3words === 'string') out.what3words = b.what3words as string | null;
  if (typeof b.is_default === 'boolean') out.is_default = b.is_default;
  if (typeof b.is_active === 'boolean') out.is_active = b.is_active;
  return out;
}

async function requireOnboarded(request: { headers?: { authorization?: string } }) {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) return { code: 'NOT_FOUND' as const, profile: null };
  if (!profile.onboarding_completed_at) return { code: 'ONBOARDING_REQUIRED' as const, profile: null };
  return { code: 'OK' as const, profile };
}

export async function instructorMeetingPointsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/meeting-points', async (request, reply) => {
    try {
      const { code, profile } = await requireOnboarded(request);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to access meeting points',
        });
      }
      const list = await listInstructorMeetingPoints(profile!.id);
      return reply.send(list);
    } catch (error) {
      request.log?.warn?.({ err: error }, 'meeting-points GET: error, returning empty list');
      return reply.send([]);
    }
  });

  app.post('/instructor/meeting-points', async (request, reply) => {
    try {
      const { code, profile } = await requireOnboarded(request);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to create meeting points',
        });
      }
      const body = request.body;
      if (!isValidCreateBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: name (string), is_default (boolean) required',
        });
      }
      const created = await createInstructorMeetingPoint({
        instructorId: profile!.id,
        name: body.name,
        description: body.description ?? '',
        address: body.address ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        what3words: body.what3words ?? null,
        is_default: body.is_default,
      });
      return reply.status(201).send(created);
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

  app.patch('/instructor/meeting-points/:id', async (request, reply) => {
    try {
      const { code, profile } = await requireOnboarded(request);
      if (code === 'NOT_FOUND') {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      if (code === 'ONBOARDING_REQUIRED') {
        return reply.status(403).send({
          ok: false,
          error: { code: ERROR_CODES.ONBOARDING_REQUIRED },
          message: 'Onboarding must be completed to update meeting points',
        });
      }
      const { id } = request.params as { id: string };
      if (!id?.trim()) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing meeting point id',
        });
      }
      const patch = getPatchBody(request.body);
      if (!patch || Object.keys(patch).length === 0) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: at least one field required',
        });
      }
      const list = await listInstructorMeetingPoints(profile!.id);
      const existing = list.find((p) => p.id === id);
      if (!existing) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Meeting point not found',
        });
      }
      const updated = await updateInstructorMeetingPoint({
        meetingPointId: id,
        instructorId: profile!.id,
        name: patch.name ?? existing.name,
        description: (patch.description !== undefined ? patch.description : existing.description) ?? '',
        address: patch.address !== undefined ? patch.address : existing.address,
        latitude: patch.latitude !== undefined ? patch.latitude : existing.latitude,
        longitude: patch.longitude !== undefined ? patch.longitude : existing.longitude,
        what3words: patch.what3words !== undefined ? patch.what3words : existing.what3words,
        is_default: patch.is_default ?? existing.is_default,
        is_active: patch.is_active ?? existing.is_active,
      });
      return reply.send(updated);
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
