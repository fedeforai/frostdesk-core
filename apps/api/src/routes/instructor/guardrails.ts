import type { FastifyInstance } from 'fastify';
import { getInstructorProfileByUserId, getInstructorGuardrails, updateInstructorGuardrails } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type PatchGuardrailsBody = {
  allow_discounts?: boolean;
  allow_off_availability?: boolean;
  require_manual_review?: boolean;
};

function getPatchGuardrailsBody(body: unknown): PatchGuardrailsBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const out: PatchGuardrailsBody = {};
  if (typeof b.allow_discounts === 'boolean') out.allow_discounts = b.allow_discounts;
  if (typeof b.allow_off_availability === 'boolean') out.allow_off_availability = b.allow_off_availability;
  if (typeof b.require_manual_review === 'boolean') out.require_manual_review = b.require_manual_review;
  return out;
}

function hasAtLeastOnePatchField(patch: PatchGuardrailsBody): boolean {
  return (
    patch.allow_discounts !== undefined ||
    patch.allow_off_availability !== undefined ||
    patch.require_manual_review !== undefined
  );
}

/**
 * Instructor guardrails routes.
 * GET /instructor/guardrails — get AI guardrails (onboarding gate). Creates default row if missing.
 * PATCH /instructor/guardrails — update AI guardrails (onboarding gate).
 * Auth: JWT. No admin, no debug bypass.
 */
export async function instructorGuardrailsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/guardrails', async (request, reply) => {
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
          message: 'Onboarding must be completed to access guardrails',
        });
      }

      const guardrails = await getInstructorGuardrails(profile.id);
      return reply.send({
        ok: true,
        guardrails: {
          allow_discounts: guardrails.allow_discounts,
          allow_off_availability: guardrails.allow_off_availability,
          require_manual_review: guardrails.require_manual_review,
        },
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

  app.patch('/instructor/guardrails', async (request, reply) => {
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
          message: 'Onboarding must be completed to update guardrails',
        });
      }

      const patch = getPatchGuardrailsBody(request.body);
      if (patch === null || !hasAtLeastOnePatchField(patch)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: at least one of allow_discounts, allow_off_availability, require_manual_review required',
        });
      }

      const guardrails = await updateInstructorGuardrails(profile.id, patch);
      return reply.send({
        ok: true,
        guardrails: {
          allow_discounts: guardrails.allow_discounts,
          allow_off_availability: guardrails.allow_off_availability,
          require_manual_review: guardrails.require_manual_review,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_PATCH') {
          return reply.status(400).send({
            ok: false,
            error: { code: ERROR_CODES.INVALID_PAYLOAD },
            message: 'Invalid patch: at least one field required',
          });
        }
        if (error.message === 'GUARDRAILS_NOT_FOUND') {
          return reply.status(404).send({
            ok: false,
            error: { code: ERROR_CODES.NOT_FOUND },
            message: 'Guardrails not found',
          });
        }
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
