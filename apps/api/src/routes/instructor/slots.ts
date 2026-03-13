/**
 * Slots endpoints:
 * - GET /instructor/slots/sellable - raw sellable slots (no buffer/notice)
 * - GET /instructor/slots/available - available slots with buffer and min_notice (Calendly-like)
 * - GET /instructor/availability-settings - get buffer/notice settings
 * - PATCH /instructor/availability-settings - update buffer/notice settings
 */

import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  computeSellableSlots,
  computeSellableSlotsFromInput,
  getInstructorAvailability,
  listAvailabilityOverridesInRange,
  getConfirmedOrModifiedBookingsInRange,
  listExternalBusyBlocksInRange,
  computeAvailableSlots,
  getAvailabilitySettings,
  updateAvailabilitySettings,
} from '@frostdesk/db';
import type { ComputeSellableSlotsInput, AvailabilitySettings } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

export async function instructorSlotsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      from?: string;
      to?: string;
      participants?: string;
      serviceId?: string;
      debug?: string;
    };
  }>('/instructor/slots/sellable', async (request, reply) => {
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
      const instructorId = profile.id;
      const { from, to, participants, serviceId, debug } = request.query;

      const fromVal = typeof from === 'string' ? from.trim() : '';
      const toVal = typeof to === 'string' ? to.trim() : '';
      if (!fromVal || !toVal) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'from and to (UTC ISO) are required',
        });
      }

      const fromMs = new Date(fromVal).getTime();
      const toMs = new Date(toVal).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'from and to must be valid ISO 8601',
        });
      }
      if (fromMs >= toMs) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'from must be before to',
        });
      }

      const includeReasons = debug === '1' || debug === 'true';
      const timezone = (profile as { timezone?: string }).timezone ?? 'UTC';

      if (includeReasons) {
        const [recurring, overrides, bookings, busyBlocks] = await Promise.all([
          getInstructorAvailability(instructorId),
          listAvailabilityOverridesInRange(instructorId, fromVal, toVal),
          getConfirmedOrModifiedBookingsInRange(instructorId, fromVal, toVal),
          listExternalBusyBlocksInRange(instructorId, fromVal, toVal),
        ]);
        const input: ComputeSellableSlotsInput = {
          from_utc: fromVal,
          to_utc: toVal,
          timezone,
          availability_windows: recurring.map((r: { day_of_week: number; start_time: string; end_time: string; is_active: boolean; meeting_point_id?: string | null }) => ({
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
            is_active: r.is_active,
            meeting_point_id: r.meeting_point_id ?? null,
          })),
          overrides: overrides.map((o: { start_utc: string; end_utc: string; is_available: boolean }) => ({ start_utc: o.start_utc, end_utc: o.end_utc, is_available: o.is_available })),
          bookings: bookings.map((b: { start_time: string; end_time: string }) => ({ start_time: b.start_time, end_time: b.end_time })),
          external_busy_blocks: busyBlocks.map((b: { start_utc: string; end_utc: string }) => ({ start_utc: b.start_utc, end_utc: b.end_utc })),
        };
        const result = computeSellableSlotsFromInput(input, { includeExclusionReasons: true });
        return reply.send({
          ok: true,
          slots: result.slots.map((s) => ({
            start_utc: s.start_utc,
            end_utc: s.end_utc,
            ...(s.meeting_point_id != null ? { meeting_point_id: s.meeting_point_id } : {}),
          })),
          excluded_ranges: result.excluded_ranges ?? undefined,
          _meta: { participants: participants ?? null, serviceId: serviceId ?? null },
        });
      }

      const slots = await computeSellableSlots({
        instructorId,
        fromUtc: fromVal,
        toUtc: toVal,
        timezone,
      });

      return reply.send({
        ok: true,
        slots: slots.map((s) => ({
          start_utc: s.start_utc,
          end_utc: s.end_utc,
          ...(s.meeting_point_id != null ? { meeting_point_id: s.meeting_point_id } : {}),
        })),
        _meta: { participants: participants ?? null, serviceId: serviceId ?? null },
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const statusCode = mapErrorToHttp(normalized.error);
      return reply.status(statusCode).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  /**
   * GET /instructor/slots/available
   * Returns available slots with buffer zones and minimum notice applied (Calendly-like).
   */
  app.get<{
    Querystring: {
      from?: string;
      to?: string;
    };
  }>('/instructor/slots/available', async (request, reply) => {
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
      const instructorId = profile.id;
      const { from, to } = request.query;

      const fromVal = typeof from === 'string' ? from.trim() : '';
      const toVal = typeof to === 'string' ? to.trim() : '';
      if (!fromVal || !toVal) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.MISSING_PARAMETERS },
          message: 'from and to (UTC ISO) are required',
        });
      }

      const fromMs = new Date(fromVal).getTime();
      const toMs = new Date(toVal).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'from and to must be valid ISO 8601',
        });
      }
      if (fromMs >= toMs) {
        return reply.status(400).send({
          ok: false,
          error: { code: ERROR_CODES.INVALID_PAYLOAD },
          message: 'from must be before to',
        });
      }

      const result = await computeAvailableSlots({
        instructorId,
        fromUtc: fromVal,
        toUtc: toVal,
      });

      return reply.send({
        ok: true,
        slots: result.slots,
        settings: result.settings,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const statusCode = mapErrorToHttp(normalized.error);
      return reply.status(statusCode).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  /**
   * GET /instructor/availability-settings
   * Returns buffer and minimum notice settings.
   */
  app.get('/instructor/availability-settings', async (request, reply) => {
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

      const settings = await getAvailabilitySettings(profile.id);

      return reply.send({
        ok: true,
        settings,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const statusCode = mapErrorToHttp(normalized.error);
      return reply.status(statusCode).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  /**
   * PATCH /instructor/availability-settings
   * Updates buffer and minimum notice settings.
   */
  app.patch<{
    Body: Partial<AvailabilitySettings>;
  }>('/instructor/availability-settings', async (request, reply) => {
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

      const body = request.body ?? {};
      const updates: Partial<AvailabilitySettings> = {};

      if (typeof body.buffer_before_minutes === 'number' && body.buffer_before_minutes >= 0) {
        updates.buffer_before_minutes = body.buffer_before_minutes;
      }
      if (typeof body.buffer_after_minutes === 'number' && body.buffer_after_minutes >= 0) {
        updates.buffer_after_minutes = body.buffer_after_minutes;
      }
      if (typeof body.min_notice_hours === 'number' && body.min_notice_hours >= 0) {
        updates.min_notice_hours = body.min_notice_hours;
      }
      if (typeof body.slot_duration_minutes === 'number' && body.slot_duration_minutes > 0) {
        updates.slot_duration_minutes = body.slot_duration_minutes;
      }

      const settings = await updateAvailabilitySettings(profile.id, updates);

      return reply.send({
        ok: true,
        settings,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const statusCode = mapErrorToHttp(normalized.error);
      return reply.status(statusCode).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });
}
