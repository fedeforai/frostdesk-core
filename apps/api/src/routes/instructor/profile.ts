import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorProfileDefinitiveByUserId,
  updateInstructorProfileByUserIdExtended,
  patchInstructorProfileByUserId,
  listInstructorReviews,
  listInstructorAssets,
  patchProfileBodySchema,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const ALLOWED_LANGUAGE_CODES = new Set([
  'en', 'it', 'fr', 'de', 'es', 'pt', 'nl', 'sv', 'no', 'da', 'pl', 'ru', 'ar', 'zh',
]);

const SHORT_BIO_MAX_LENGTH = 500;

const OPERATIONAL_NUMERIC_KEYS = [
  'max_students_private', 'max_students_group', 'min_booking_duration_minutes',
  'advance_booking_hours', 'travel_buffer_minutes',
] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Normalize marketing_fields from definitive (camelCase/nested) or legacy (snake_case) to unified snake_case flat for UI. */
function normalizeMarketingToUnified(mf: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!mf || typeof mf !== 'object') return {};
  return {
    short_bio: mf.short_bio ?? mf.shortBio,
    extended_bio: mf.extended_bio ?? mf.extendedBio,
    teaching_philosophy: mf.teaching_philosophy ?? mf.teachingPhilosophy,
    target_audience: mf.target_audience ?? mf.targetAudiences,
    usp_tags: mf.usp_tags ?? mf.uspTags,
  };
}

/** Normalize operational_fields from definitive (nested) or legacy (flat) to unified flat snake_case for UI. */
function normalizeOperationalToUnified(of: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!of || typeof of !== 'object') return {};
  const constraints = isPlainObject(of.constraints) ? of.constraints : {};
  const location = isPlainObject(of.location) ? of.location : {};
  return {
    max_students_private: of.max_students_private ?? constraints.maxPrivate,
    max_students_group: of.max_students_group ?? constraints.maxGroup,
    min_booking_duration_minutes: of.min_booking_duration_minutes ?? constraints.minDurationMin,
    same_day_booking_allowed: of.same_day_booking_allowed ?? constraints.sameDayAllowed,
    advance_booking_hours: of.advance_booking_hours ?? constraints.advanceHours,
    travel_buffer_minutes: of.travel_buffer_minutes ?? location.travelBufferMin,
  };
}

function validateLegacyPatch(
  body: Record<string, unknown>,
  current: { full_name: string; base_resort: string; working_language: string; contact_email: string; languages?: string[]; display_name?: string | null; slug?: string | null; timezone?: string | null }
): { ok: true; full_name: string; base_resort: string; working_language: string; contact_email: string; languages?: string[]; display_name?: string | null; slug?: string | null; timezone?: string | null; marketing_fields?: Record<string, unknown>; operational_fields?: Record<string, unknown> } | { ok: false; status: number; message: string } {
  const full_name = typeof body.full_name === 'string' ? body.full_name : current.full_name ?? '';
  const base_resort = typeof body.base_resort === 'string' ? body.base_resort : current.base_resort ?? '';
  const working_language = typeof body.working_language === 'string' ? body.working_language : current.working_language ?? '';
  const contact_email = typeof body.contact_email === 'string' ? body.contact_email : current.contact_email ?? '';
  let display_name: string | null | undefined = current.display_name;
  if (body.display_name !== undefined) display_name = body.display_name === null ? null : (typeof body.display_name === 'string' ? body.display_name : current.display_name);
  let slug: string | null | undefined = current.slug;
  if (body.slug !== undefined) slug = body.slug === null ? null : (typeof body.slug === 'string' ? body.slug : current.slug);
  let timezone: string | null | undefined = current.timezone ?? null;
  if (body.timezone !== undefined) timezone = body.timezone === null ? null : (typeof body.timezone === 'string' ? body.timezone.trim() || null : current.timezone ?? null);

  if (working_language && !ALLOWED_LANGUAGE_CODES.has(working_language)) {
    return { ok: false, status: 400, message: 'working_language must be one of: ' + [...ALLOWED_LANGUAGE_CODES].join(', ') };
  }

  let languages: string[] | undefined;
  if (Array.isArray(body.languages)) {
    const invalid = (body.languages as unknown[]).find((x) => typeof x !== 'string' || !ALLOWED_LANGUAGE_CODES.has(x));
    if (invalid !== undefined) {
      return { ok: false, status: 400, message: 'languages must be an array of allowed language codes' };
    }
    languages = body.languages as string[];
  }

  const marketing_fields = body.marketing_fields;
  if (marketing_fields !== undefined) {
    if (!isPlainObject(marketing_fields)) {
      return { ok: false, status: 400, message: 'marketing_fields must be a plain object' };
    }
    const short_bio = marketing_fields.short_bio;
    if (short_bio !== undefined && short_bio !== null) {
      const s = String(short_bio);
      if (s.length > SHORT_BIO_MAX_LENGTH) {
        return { ok: false, status: 400, message: 'marketing_fields.short_bio must be at most ' + SHORT_BIO_MAX_LENGTH + ' characters' };
      }
    }
    const usp_tags = marketing_fields.usp_tags;
    if (usp_tags !== undefined && usp_tags !== null && !Array.isArray(usp_tags)) {
      return { ok: false, status: 400, message: 'marketing_fields.usp_tags must be a string array' };
    }
    if (Array.isArray(usp_tags)) {
      const invalid = usp_tags.find((x) => typeof x !== 'string');
      if (invalid !== undefined) {
        return { ok: false, status: 400, message: 'marketing_fields.usp_tags must contain only strings' };
      }
    }
  }

  const operational_fields = body.operational_fields;
  if (operational_fields !== undefined) {
    if (!isPlainObject(operational_fields)) {
      return { ok: false, status: 400, message: 'operational_fields must be a plain object' };
    }
    const same_day = operational_fields.same_day_booking_allowed;
    if (same_day !== undefined && same_day !== null && typeof same_day !== 'boolean') {
      return { ok: false, status: 400, message: 'operational_fields.same_day_booking_allowed must be a boolean' };
    }
    for (const key of OPERATIONAL_NUMERIC_KEYS) {
      const val = operational_fields[key];
      if (val !== undefined && val !== null) {
        const n = Number(val);
        if (Number.isNaN(n) || n < 0) {
          return { ok: false, status: 400, message: 'operational_fields.' + key + ' must be a number >= 0' };
        }
      }
    }
  }

  return {
    ok: true,
    full_name,
    base_resort,
    working_language,
    contact_email,
    ...(languages !== undefined ? { languages } : {}),
    ...(display_name !== undefined ? { display_name } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(timezone !== undefined ? { timezone } : {}),
    ...(marketing_fields !== undefined ? { marketing_fields: marketing_fields as Record<string, unknown> } : {}),
    ...(operational_fields !== undefined ? { operational_fields: operational_fields as Record<string, unknown> } : {}),
  };
}

/**
 * Resolve instructor profile by auth user_id. Tries definitive first, then legacy.
 * Returns { profile, instructorId } or null.
 */
async function resolveProfile(userId: string) {
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) {
    return { profile: definitive, instructorId: definitive.id };
  }
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) {
    return { profile: legacy, instructorId: legacy.id };
  }
  return null;
}

/**
 * Instructor profile routes (read/update). Auth: JWT.
 * GET /instructor/profile, PATCH /instructor/profile, GET /instructor/reviews, GET /instructor/assets.
 * instructor_id is always derived from JWT (never trust client).
 */
export async function instructorProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/profile', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const resolved = await resolveProfile(userId);
      if (!resolved) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const { profile } = resolved;
      if ('profile_status' in profile) {
        const mf = (profile as { marketing_fields?: Record<string, unknown> }).marketing_fields;
        const of = (profile as { operational_fields?: Record<string, unknown> }).operational_fields;
        return reply.send({
          ok: true,
          profile: {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            display_name: profile.display_name,
            slug: profile.slug,
            profile_status: profile.profile_status,
            timezone: profile.timezone,
            availability_mode: profile.availability_mode,
            calendar_sync_enabled: profile.calendar_sync_enabled,
            marketing_fields: normalizeMarketingToUnified(mf),
            operational_fields: normalizeOperationalToUnified(of),
            pricing_config: profile.pricing_config,
            ai_config: profile.ai_config,
            compliance: profile.compliance,
            approval_status: profile.approval_status,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            base_resort: profile.base_resort ?? '',
            working_language: profile.working_language ?? '',
            contact_email: profile.contact_email ?? '',
            onboarding_completed_at: profile.onboarding_completed_at ?? null,
          },
        });
      }
      return reply.send({
        ok: true,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          base_resort: (profile as { base_resort?: string }).base_resort ?? '',
          working_language: (profile as { working_language?: string }).working_language ?? '',
          contact_email: (profile as { contact_email?: string }).contact_email ?? '',
          languages: (profile as { languages?: string[] }).languages ?? [],
          display_name: (profile as { display_name?: string | null }).display_name ?? null,
          slug: (profile as { slug?: string | null }).slug ?? null,
          timezone: (profile as { timezone?: string | null }).timezone ?? null,
          onboarding_completed_at: (profile as { onboarding_completed_at?: string | null }).onboarding_completed_at ?? null,
          marketing_fields: (profile as { marketing_fields?: Record<string, unknown> }).marketing_fields ?? {},
          operational_fields: (profile as { operational_fields?: Record<string, unknown> }).operational_fields ?? {},
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

  app.patch('/instructor/profile', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const parse = patchProfileBodySchema.safeParse(request.body);
      if (parse.success) {
        const updated = await patchInstructorProfileByUserId(userId, parse.data);
        if (updated) {
          return reply.send({
            ok: true,
            profile: {
              id: updated.id,
              user_id: updated.user_id,
              full_name: updated.full_name,
              display_name: updated.display_name,
              slug: updated.slug,
              profile_status: updated.profile_status,
              timezone: updated.timezone,
              availability_mode: updated.availability_mode,
              calendar_sync_enabled: updated.calendar_sync_enabled,
              marketing_fields: updated.marketing_fields,
              operational_fields: updated.operational_fields,
              pricing_config: updated.pricing_config,
              ai_config: updated.ai_config,
              compliance: updated.compliance,
              approval_status: updated.approval_status,
              created_at: updated.created_at,
              updated_at: updated.updated_at,
              base_resort: updated.base_resort ?? '',
              working_language: updated.working_language ?? '',
              contact_email: updated.contact_email ?? '',
              onboarding_completed_at: updated.onboarding_completed_at ?? null,
            },
          });
        }
      }
      const legacyBody = request.body as Record<string, unknown>;
      const current = await getInstructorProfileByUserId(userId);
      if (!current) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const cur = current as {
        full_name: string;
        base_resort: string;
        working_language: string;
        contact_email: string;
        languages?: string[];
        display_name?: string | null;
        slug?: string | null;
        timezone?: string | null;
      };
      const currentWithDisplay = {
        full_name: cur.full_name,
        base_resort: cur.base_resort,
        working_language: cur.working_language,
        contact_email: cur.contact_email,
        languages: cur.languages,
        display_name: cur.display_name ?? null,
        slug: cur.slug ?? null,
        timezone: cur.timezone ?? null,
      };
      const validated = validateLegacyPatch(legacyBody, currentWithDisplay);
      if (!validated.ok) {
        return reply.status(validated.status).send({
          ok: false,
          error: { code: 'VALIDATION_ERROR' },
          message: validated.message,
        });
      }
      const { full_name, base_resort, working_language, contact_email, languages, display_name, slug, timezone, marketing_fields, operational_fields } = validated;
      const updatedLegacy = await updateInstructorProfileByUserIdExtended({
        userId,
        full_name,
        base_resort,
        working_language,
        contact_email,
        ...(languages !== undefined ? { languages } : {}),
        ...(display_name !== undefined ? { display_name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(marketing_fields !== undefined ? { marketing_fields } : {}),
        ...(operational_fields !== undefined ? { operational_fields } : {}),
      });
      return reply.send({
        ok: true,
        profile: {
          id: updatedLegacy.id,
          full_name: updatedLegacy.full_name,
          base_resort: updatedLegacy.base_resort,
          working_language: updatedLegacy.working_language,
          contact_email: updatedLegacy.contact_email,
          languages: (updatedLegacy as { languages?: string[] }).languages ?? [],
          display_name: (updatedLegacy as { display_name?: string | null }).display_name ?? null,
          slug: (updatedLegacy as { slug?: string | null }).slug ?? null,
          timezone: (updatedLegacy as { timezone?: string | null }).timezone ?? null,
          onboarding_completed_at: (updatedLegacy as { onboarding_completed_at?: string | null }).onboarding_completed_at ?? null,
          marketing_fields: (updatedLegacy as { marketing_fields?: Record<string, unknown> }).marketing_fields ?? {},
          operational_fields: (updatedLegacy as { operational_fields?: Record<string, unknown> }).operational_fields ?? {},
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

  app.get('/instructor/reviews', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const resolved = await resolveProfile(userId);
      if (!resolved) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const reviews = await listInstructorReviews(resolved.instructorId);
      return reply.send({ ok: true, reviews });
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

  app.get('/instructor/assets', async (request, reply) => {
    try {
      const userId = await getUserIdFromJwt(request);
      const resolved = await resolveProfile(userId);
      if (!resolved) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Instructor profile not found',
        });
      }
      const assets = await listInstructorAssets(resolved.instructorId);
      return reply.send({ ok: true, assets });
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
