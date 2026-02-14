/**
 * Instructor policy document: GET (single doc) and PATCH (optimistic lock with version).
 * Auth: JWT. Onboarding gate. Audit on PATCH with diff_jsonb.
 */

import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorPolicyDocument,
  patchInstructorPolicyDocument,
  patchInstructorPolicyBodySchema,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function requireOnboarded(request: { headers?: { authorization?: string } }) {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) return { code: 'NOT_FOUND' as const, profile: null };
  if (!profile.onboarding_completed_at) return { code: 'ONBOARDING_REQUIRED' as const, profile: null };
  return { code: 'OK' as const, profile };
}

function parseIfMatchVersion(headers: { 'if-match'?: string }): number | null {
  const ifMatch = headers['if-match'];
  if (!ifMatch || typeof ifMatch !== 'string') return null;
  const v = parseInt(ifMatch.trim(), 10);
  return Number.isInteger(v) && v >= 1 ? v : null;
}

export async function instructorPoliciesDocumentRoutes(app: FastifyInstance): Promise<void> {
  app.log?.info?.('Registering GET/PATCH /instructor/policies (policy document)');
  app.get('/instructor/policies', async (request, reply) => {
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
          message: 'Onboarding must be completed to access policies',
        });
      }
      const doc = await getInstructorPolicyDocument(profile!.id);
      return reply.send({
        structured: doc.structured,
        freeform: doc.freeform,
        version: doc.version,
        updated_by: doc.updated_by,
        updated_at: doc.updated_at,
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

  app.patch('/instructor/policies', async (request, reply) => {
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
          message: 'Onboarding must be completed to update policies',
        });
      }
      const version = parseIfMatchVersion(request.headers as { 'if-match'?: string });
      if (version === null) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'If-Match header with current version (integer) is required for PATCH',
        });
      }
      const parsed = patchInstructorPolicyBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: parsed.error.message,
        });
      }
      const body = parsed.data;
      if (body.structured === undefined && body.freeform === undefined) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'At least one of structured or freeform is required',
        });
      }
      const doc = await patchInstructorPolicyDocument({
        instructorId: profile!.id,
        expectedVersion: version,
        updatedBy: profile!.id,
        structured: body.structured,
        freeform: body.freeform,
      });
      return reply.send({
        structured: doc.structured,
        freeform: doc.freeform,
        version: doc.version,
        updated_by: doc.updated_by,
        updated_at: doc.updated_at,
      });
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'VERSION_MISMATCH') {
        return reply.status(409).send({
          ok: false,
          error: { code: ERROR_CODES.VERSION_MISMATCH },
          message: err.message,
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
