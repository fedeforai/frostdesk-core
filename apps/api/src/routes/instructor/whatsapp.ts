import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorWhatsappAccount,
  connectInstructorWhatsappAccount,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

type ConnectWhatsappBody = {
  phone_number: string;
  phone_number_id?: string | null;
  waba_id?: string | null;
};

function isValidConnectBody(body: unknown): body is ConnectWhatsappBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.phone_number !== 'string' || !b.phone_number.trim()) return false;
  if (b.phone_number_id !== undefined && b.phone_number_id !== null && typeof b.phone_number_id !== 'string') return false;
  if (b.waba_id !== undefined && b.waba_id !== null && typeof b.waba_id !== 'string') return false;
  return true;
}

function toApiAccount(account: { phone_number: string; status: string }) {
  return {
    phone_number: account.phone_number,
    status: account.status,
  };
}

/**
 * Instructor WhatsApp routes (linking only — no messaging, no webhook, no AI).
 * GET /instructor/whatsapp — get linked account or null.
 * POST /instructor/whatsapp/connect — create or replace link (status=pending).
 * Auth: JWT. Onboarding gate. No admin, no debug bypass.
 */
export async function instructorWhatsappRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/whatsapp', async (request, reply) => {
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
          message: 'Onboarding must be completed to access WhatsApp account',
        });
      }

      const account = await getInstructorWhatsappAccount(profile.id);
      return reply.send({
        ok: true,
        account: account ? toApiAccount(account) : null,
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

  app.post('/instructor/whatsapp/connect', async (request, reply) => {
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
          message: 'Onboarding must be completed to connect WhatsApp',
        });
      }

      const body = request.body;
      if (!isValidConnectBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: phone_number (string) required',
        });
      }

      const account = await connectInstructorWhatsappAccount({
        instructorId: profile.id,
        phoneNumber: body.phone_number.trim(),
        phoneNumberId: body.phone_number_id?.trim() || null,
        wabaId: body.waba_id?.trim() || null,
      });
      return reply.status(201).send({
        ok: true,
        account: toApiAccount(account),
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
