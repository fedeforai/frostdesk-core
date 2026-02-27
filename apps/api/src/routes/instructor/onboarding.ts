import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  createInstructorProfile,
  updateInstructorProfileByUserId,
  completeInstructorOnboarding,
  connectInstructorWhatsappAccount,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function optionalString(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  return s === '' ? null : s;
}

/**
 * POST /instructor/onboarding/draft
 * Auth: Bearer JWT. Merges body into existing profile; in-progress = profile exists with onboarding_completed_at null.
 * Body: optional full_name, base_resort, working_language, whatsapp_phone, onboarding_payload (merged in-memory only).
 */
export async function instructorOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: {
      full_name?: unknown;
      base_resort?: unknown;
      working_language?: unknown;
      whatsapp_phone?: unknown;
      onboarding_payload?: unknown;
      ui_language?: unknown;
    };
  }>('/instructor/onboarding/draft', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const email = ''; // getUserIdFromJwt returns only the ID
      const body = request.body ?? {};
      let existing: Awaited<ReturnType<typeof getInstructorProfileByUserId>> = null;
      try {
        existing = await getInstructorProfileByUserId(userId);
      } catch {
        existing = null;
      }
      const full_name = optionalString(body.full_name) ?? existing?.full_name ?? '';
      const base_resort = optionalString(body.base_resort) ?? existing?.base_resort ?? '';
      const working_language = optionalString(body.working_language) ?? existing?.working_language ?? 'en';
      const whatsapp_phone = optionalString(body.whatsapp_phone) ?? null;
      const contactEmail = email ?? existing?.contact_email ?? '';

      if (!existing && (!full_name || !base_resort || !working_language)) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'full_name, base_resort, and working_language are required for first-time draft',
        });
      }
      if (body.whatsapp_phone !== undefined && (typeof body.whatsapp_phone !== 'string' || body.whatsapp_phone.trim() === '')) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'whatsapp_phone must be non-empty when provided',
        });
      }

      if (!existing) {
        await createInstructorProfile({
          id: userId,
          full_name,
          base_resort,
          working_language,
          contact_email: contactEmail,
        });
      } else {
        await updateInstructorProfileByUserId({
          userId,
          full_name,
          base_resort,
          working_language,
          contact_email: contactEmail,
        });
      }
      return reply.send({ ok: true });
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

  app.post<{
    Body: {
      full_name?: unknown;
      base_resort?: unknown;
      working_language?: unknown;
      whatsapp_phone?: unknown;
      contact_email?: unknown;
      onboarding_payload?: unknown;
    };
  }>('/instructor/onboarding/complete', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const body = request.body ?? {};
      const full_name = isNonEmptyString(body.full_name) ? body.full_name.trim() : '';
      const base_resort = isNonEmptyString(body.base_resort) ? body.base_resort.trim() : '';
      const working_language = isNonEmptyString(body.working_language) ? body.working_language.trim() : '';
      const whatsapp_phone = isNonEmptyString(body.whatsapp_phone) ? body.whatsapp_phone.trim() : '';
      const contact_email = isNonEmptyString(body.contact_email) ? body.contact_email.trim() : '';

      if (!full_name || !base_resort || !working_language || !whatsapp_phone) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: normalized.error,
          message: 'full_name, base_resort, working_language, and whatsapp_phone are required',
        });
      }

      await updateInstructorProfileByUserId({
        userId,
        full_name,
        base_resort,
        working_language,
        contact_email: contact_email || '',
      });

      const profile = await getInstructorProfileByUserId(userId);
      if (profile?.id) {
        await completeInstructorOnboarding(profile.id);
      }

      // Link WhatsApp number so Settings shows "Il tuo numero WhatsApp è collegato a FrostDesk"
      try {
        if (profile?.id && whatsapp_phone) {
          await connectInstructorWhatsappAccount(profile.id, whatsapp_phone);
        }
      } catch {
        // Non-blocking: profile/WhatsApp link is best-effort
      }

      return reply.send({ ok: true });
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
