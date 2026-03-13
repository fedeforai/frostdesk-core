import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getBookingRules,
  getActiveBookingRules,
  createBookingRule,
  updateBookingRule,
  deleteBookingRule,
  toggleBookingRule,
  validateBookingRules,
  getDefaultConfig,
  getTravelTimes,
  getConfirmedOrModifiedBookingsInRange,
  BookingRuleNotFoundError,
  type BookingRuleType,
  type BookingRuleConfig,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

const RULE_TYPES: BookingRuleType[] = [
  'min_duration',
  'advance_booking',
  'max_advance',
  'travel_buffer',
  'gap_protection',
  'daily_limit',
  'weekly_limit',
  'full_week_preference',
];

type CreateRuleBody = {
  rule_type: string;
  config?: Record<string, unknown>;
  valid_from?: string | null;
  valid_to?: string | null;
  priority?: number;
  is_active?: boolean;
};

type UpdateRuleBody = {
  config?: Record<string, unknown>;
  valid_from?: string | null;
  valid_to?: string | null;
  priority?: number;
  is_active?: boolean;
};

type ValidateBookingBody = {
  start_time: string;
  end_time: string;
  meeting_point_id?: string | null;
};

function isValidRuleType(s: string): s is BookingRuleType {
  return RULE_TYPES.includes(s as BookingRuleType);
}

function isValidCreateRuleBody(body: unknown): body is CreateRuleBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.rule_type === 'string' &&
    (b.config === undefined || typeof b.config === 'object') &&
    (b.valid_from === undefined || b.valid_from === null || typeof b.valid_from === 'string') &&
    (b.valid_to === undefined || b.valid_to === null || typeof b.valid_to === 'string') &&
    (b.priority === undefined || typeof b.priority === 'number') &&
    (b.is_active === undefined || typeof b.is_active === 'boolean')
  );
}

function isValidUpdateRuleBody(body: unknown): body is UpdateRuleBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    (b.config === undefined || typeof b.config === 'object') &&
    (b.valid_from === undefined || b.valid_from === null || typeof b.valid_from === 'string') &&
    (b.valid_to === undefined || b.valid_to === null || typeof b.valid_to === 'string') &&
    (b.priority === undefined || typeof b.priority === 'number') &&
    (b.is_active === undefined || typeof b.is_active === 'boolean')
  );
}

function isValidValidateBookingBody(body: unknown): body is ValidateBookingBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.start_time === 'string' &&
    typeof b.end_time === 'string' &&
    (b.meeting_point_id === undefined || b.meeting_point_id === null || typeof b.meeting_point_id === 'string')
  );
}

function hasUpdateFields(body: UpdateRuleBody): boolean {
  return (
    body.config !== undefined ||
    body.valid_from !== undefined ||
    body.valid_to !== undefined ||
    body.priority !== undefined ||
    body.is_active !== undefined
  );
}

/**
 * Instructor booking rules routes.
 * GET /instructor/booking-rules — list all rules
 * GET /instructor/booking-rules/active — list active rules
 * GET /instructor/booking-rules/defaults — get default configs for all rule types
 * POST /instructor/booking-rules — create rule
 * PATCH /instructor/booking-rules/:id — update rule
 * POST /instructor/booking-rules/:id/toggle — toggle is_active
 * DELETE /instructor/booking-rules/:id — delete rule
 * POST /instructor/booking-rules/validate — validate a booking against rules
 */
export async function instructorBookingRulesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/instructor/booking-rules', async (request, reply) => {
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
          message: 'Onboarding must be completed to access booking rules',
        });
      }

      const rules = await getBookingRules(profile.id);
      return reply.send({ ok: true, rules });
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

  app.get('/instructor/booking-rules/active', async (request, reply) => {
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
          message: 'Onboarding must be completed to access booking rules',
        });
      }

      const query = request.query as { date?: string };
      const rules = await getActiveBookingRules(profile.id, query.date);
      return reply.send({ ok: true, rules });
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

  app.get('/instructor/booking-rules/defaults', async (_request, reply) => {
    const defaults: Record<BookingRuleType, BookingRuleConfig> = {} as Record<BookingRuleType, BookingRuleConfig>;
    for (const ruleType of RULE_TYPES) {
      defaults[ruleType] = getDefaultConfig(ruleType);
    }
    return reply.send({ ok: true, defaults });
  });

  app.post('/instructor/booking-rules', async (request, reply) => {
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
          message: 'Onboarding must be completed to create booking rules',
        });
      }

      const body = request.body;
      if (!isValidCreateRuleBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: rule_type (string) required',
        });
      }

      if (!isValidRuleType(body.rule_type)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: `rule_type must be one of: ${RULE_TYPES.join(', ')}`,
        });
      }

      const config = (body.config ?? getDefaultConfig(body.rule_type)) as BookingRuleConfig;

      const rule = await createBookingRule({
        instructorId: profile.id,
        ruleType: body.rule_type,
        config,
        validFrom: body.valid_from ?? null,
        validTo: body.valid_to ?? null,
        priority: body.priority ?? 0,
        isActive: body.is_active ?? true,
      });

      return reply.status(201).send({ ok: true, rule });
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

  app.patch('/instructor/booking-rules/:id', async (request, reply) => {
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
          message: 'Onboarding must be completed to update booking rules',
        });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing rule id',
        });
      }

      const body = request.body;
      if (!isValidUpdateRuleBody(body) || !hasUpdateFields(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: at least one of config, valid_from, valid_to, priority, is_active required',
        });
      }

      const rule = await updateBookingRule({
        id,
        instructorId: profile.id,
        config: body.config as BookingRuleConfig | undefined,
        validFrom: body.valid_from,
        validTo: body.valid_to,
        priority: body.priority,
        isActive: body.is_active,
      });

      return reply.send({ ok: true, rule });
    } catch (error) {
      if (error instanceof BookingRuleNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Booking rule not found',
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

  app.post('/instructor/booking-rules/:id/toggle', async (request, reply) => {
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
          message: 'Onboarding must be completed to toggle booking rules',
        });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing rule id',
        });
      }

      const rule = await toggleBookingRule(id, profile.id);
      return reply.send({ ok: true, rule });
    } catch (error) {
      if (error instanceof BookingRuleNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Booking rule not found',
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

  app.delete('/instructor/booking-rules/:id', async (request, reply) => {
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
          message: 'Onboarding must be completed to delete booking rules',
        });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Missing rule id',
        });
      }

      await deleteBookingRule(id, profile.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof BookingRuleNotFoundError) {
        return reply.status(404).send({
          ok: false,
          error: { code: ERROR_CODES.NOT_FOUND },
          message: 'Booking rule not found',
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

  app.post('/instructor/booking-rules/validate', async (request, reply) => {
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
          message: 'Onboarding must be completed to validate bookings',
        });
      }

      const body = request.body;
      if (!isValidValidateBookingBody(body)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'Invalid body: start_time and end_time (ISO strings) required',
        });
      }

      const startDate = body.start_time.split('T')[0];
      const endDate = body.end_time.split('T')[0];
      const rangeStart = `${startDate}T00:00:00Z`;
      const rangeEnd = `${endDate}T23:59:59Z`;

      const [rules, bookingsResult, travelTimes] = await Promise.all([
        getActiveBookingRules(profile.id, startDate),
        getConfirmedOrModifiedBookingsInRange(profile.id, rangeStart, rangeEnd),
        getTravelTimes(profile.id),
      ]);

      const existingBookings = bookingsResult.map(b => ({
        start_time: b.start_time,
        end_time: b.end_time,
        meeting_point_id: (b as { meeting_point_id?: string | null }).meeting_point_id ?? null,
      }));

      const result = validateBookingRules({
        startTime: body.start_time,
        endTime: body.end_time,
        meetingPointId: body.meeting_point_id ?? null,
        instructorId: profile.id,
        rules,
        existingBookings,
        travelTimes,
      });

      return reply.send({ ok: true, ...result });
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
