/**
 * Loop 2: Instructor booking actions.
 * All transitions go through transitionBookingState. Audit with actor=human.
 * Read/list/create: GET /instructor/bookings, GET /instructor/bookings/:id, POST /instructor/bookings.
 * No DB schema changes. No calendar/payment. No background workers.
 * Source: docs/diagrams/BOOKING_STATE_MACHINE.mmd
 */

import type { FastifyInstance } from 'fastify';
import {
  getBookingById,
  getBookingByIdWithExpiryCheck,
  listInstructorBookings,
  createBooking,
  updateBooking,
  updateBookingDetails,
  updateBookingStatus,
  deleteBooking,
  updateBookingState,
  recordBookingAudit,
  transitionBookingState,
  isValidUUID,
  getCustomerById,
  insertAuditEvent,
  validateAvailability,
  AvailabilityConflictError,
} from '@frostdesk/db';
import type { ListInstructorBookingsFilters } from '@frostdesk/db';
import type { UpdateBookingDetailsPatch } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import {
  getInstructorProfileByUserId,
  getInstructorProfileDefinitiveByUserId,
} from '@frostdesk/db';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';
import { isPilotInstructor } from '../../lib/pilot_instructor.js';
import { checkBillingGate } from '../../lib/billing_gate.js';

/**
 * Resolve instructor id + billing status from JWT.
 * Tries definitive profile first (has billing_status), then legacy (defaults to 'pilot').
 */
async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<{ id: string; billingStatus: string }> {
  const userId = await getUserIdFromJwt(request);
  const definitive = await getInstructorProfileDefinitiveByUserId(userId);
  if (definitive) return { id: definitive.id, billingStatus: definitive.billing_status ?? 'pilot' };
  const legacy = await getInstructorProfileByUserId(userId);
  if (legacy) return { id: legacy.id, billingStatus: 'pilot' };
  const e = new Error('Instructor profile not found');
  (e as any).code = ERROR_CODES.NOT_FOUND;
  throw e;
}

/**
 * Shared: load booking, enforce ownership (404 if not found or not owner), apply expiry.
 * Returns { booking, instructorId, billingStatus } or null after sending error response.
 */
async function loadBookingAndEnforceOwnership(
  request: { headers?: { authorization?: string }; params: { id: string } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
): Promise<{ booking: any; instructorId: string; billingStatus: string } | null> {
  const { id: instructorId, billingStatus } = await getInstructorId(request);
  const bookingId = (request.params as { id: string }).id;
  if (!bookingId?.trim()) {
    reply.status(400).send({
      ok: false,
      error: ERROR_CODES.MISSING_PARAMETERS,
      message: 'Booking id required',
    });
    return null;
  }
  const booking = await getBookingByIdWithExpiryCheck(bookingId.trim(), instructorId);
  if (!booking) {
    reply.status(404).send({
      ok: false,
      error: ERROR_CODES.BOOKING_NOT_FOUND,
      message: 'Booking not found',
    });
    return null;
  }
  const ownerId = String(booking.instructor_id);
  if (ownerId !== instructorId) {
    reply.status(403).send({
      ok: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Not authorized to access this booking',
    });
    return null;
  }
  return { booking, instructorId, billingStatus };
}

/**
 * Persist transition and audit, return updated booking.
 */
async function applyTransition(
  bookingId: string,
  currentState: string,
  nextState: string,
  instructorId: string
): Promise<any> {
  transitionBookingState(currentState as any, nextState as any);
  await recordBookingAudit({
    bookingId,
    previousState: currentState as any,
    newState: nextState as any,
    actor: 'human',
  });
  const updated = await updateBookingState(bookingId, nextState as any);
  return updated ?? { id: bookingId, status: nextState };
}

export async function instructorBookingRoutes(app: FastifyInstance): Promise<void> {
  // GET /instructor/bookings — list all bookings for the instructor (never accept instructorId from client)
  // Query: date_from, date_to (YYYY-MM-DD), payment_status ('unpaid' = unpaid|pending|failed)
  app.get('/instructor/bookings', async (request, reply) => {
    try {
      const { id: instructorId } = await getInstructorId(request);
      const query = request.query as { date_from?: string; date_to?: string; payment_status?: string };
      const filters: ListInstructorBookingsFilters | undefined =
        query.date_from != null || query.date_to != null || query.payment_status != null
          ? {
              dateFrom: query.date_from ?? undefined,
              dateTo: query.date_to ?? undefined,
              paymentStatus: query.payment_status ?? undefined,
            }
          : undefined;
      const items = await listInstructorBookings(instructorId, filters);
      return reply.send({ items: items ?? [] });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // GET /instructor/bookings/:id — single booking (ownership enforced)
  app.get<{ Params: { id: string } }>('/instructor/bookings/:id', async (request, reply) => {
    try {
      const { id: instructorId } = await getInstructorId(request);
      const bookingId = (request.params as { id: string }).id;
      if (!bookingId?.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'Booking id required',
        });
      }
      if (!isValidUUID(bookingId.trim())) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'Invalid booking ID format (must be UUID)',
        });
      }
      const booking = await getBookingById(bookingId.trim(), instructorId);
      if (!booking) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.BOOKING_NOT_FOUND,
          message: 'Booking not found',
        });
      }
      return reply.send(booking);
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings — create booking. Requires customerId (existing customer); ownership enforced.
  app.post<{ Body: Record<string, unknown> }>('/instructor/bookings', async (request, reply) => {
    try {
      const { id: instructorId, billingStatus } = await getInstructorId(request);
      if (!isPilotInstructor(instructorId)) {
        return reply.status(402).send({
          ok: false,
          error: ERROR_CODES.PILOT_ONLY,
          message: 'This feature is only available for pilot instructors.',
        });
      }
      const billingBlock = checkBillingGate(billingStatus);
      if (billingBlock) {
        return reply.status(402).send({ ok: false, error: billingBlock.error, message: billingBlock.message });
      }
      const body = request.body as Record<string, unknown>;
      const customerId =
        typeof body.customer_id === 'string'
          ? body.customer_id.trim()
          : typeof body.customerId === 'string'
            ? body.customerId.trim()
            : '';
      const hasCustomerNameOnly =
        (typeof body.customer_name === 'string' && body.customer_name.trim() !== '') ||
        (typeof body.customerName === 'string' && body.customerName.trim() !== '');
      const startTime =
        typeof body.start_time === 'string'
          ? body.start_time.trim()
          : typeof body.startTime === 'string'
            ? body.startTime.trim()
            : '';
      const endTime =
        typeof body.end_time === 'string'
          ? body.end_time.trim()
          : typeof body.endTime === 'string'
            ? body.endTime.trim()
            : '';
      if (!customerId) {
        if (hasCustomerNameOnly) {
          return reply.status(400).send({
            ok: false,
            error: ERROR_CODES.CUSTOMER_REQUIRED,
            message: 'Select or create a customer first',
          });
        }
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'customer_id (or customerId) is required; create a customer first if needed',
        });
      }
      if (!isValidUUID(customerId)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'customer_id must be a valid UUID',
        });
      }
      const customer = await getCustomerById(customerId, instructorId);
      if (!customer) {
        return reply.status(403).send({
          ok: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Customer not found or does not belong to you',
        });
      }
      if (!startTime) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'start_time (or startTime) is required',
        });
      }
      if (!endTime) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'end_time (or endTime) is required',
        });
      }
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'start_time must be before end_time',
        });
      }
      const serviceId =
        body.service_id !== undefined && body.service_id !== null
          ? String(body.service_id)
          : body.serviceId !== undefined && body.serviceId !== null
            ? String(body.serviceId)
            : null;
      const meetingPointId =
        body.meeting_point_id !== undefined && body.meeting_point_id !== null
          ? String(body.meeting_point_id)
          : body.meetingPointId !== undefined && body.meetingPointId !== null
            ? String(body.meetingPointId)
            : null;
      const notes =
        body.notes !== undefined && body.notes !== null ? String(body.notes) : null;

      const customerName =
        (customer.display_name && String(customer.display_name).trim()) ||
        (customer.phone_number && String(customer.phone_number).trim()) ||
        'Customer';

      // ── Optional lesson detail fields ────────────────────────────────────────
      const rawDuration = body.duration_minutes ?? body.durationMinutes;
      const durationMinutes =
        rawDuration != null && Number.isFinite(Number(rawDuration))
          ? Math.round(Number(rawDuration))
          : null;
      if (durationMinutes != null && (durationMinutes < 15 || durationMinutes > 480)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'duration_minutes must be between 15 and 480',
        });
      }

      const rawPartySize = body.party_size ?? body.partySize;
      const partySize =
        rawPartySize != null && Number.isFinite(Number(rawPartySize))
          ? Math.round(Number(rawPartySize))
          : null;
      if (partySize != null && (partySize < 1 || partySize > 20)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'party_size must be between 1 and 20',
        });
      }

      const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'mixed', 'unknown'] as const;
      const rawSkill = body.skill_level ?? body.skillLevel;
      const skillLevel =
        rawSkill != null && typeof rawSkill === 'string' && VALID_SKILL_LEVELS.includes(rawSkill.toLowerCase() as any)
          ? rawSkill.toLowerCase()
          : null;

      const VALID_CURRENCIES = ['eur', 'gbp', 'chf'] as const;
      const rawAmount = body.amount_cents ?? body.amountCents;
      const amountCents =
        rawAmount != null && Number.isFinite(Number(rawAmount))
          ? Math.round(Number(rawAmount))
          : null;
      if (amountCents != null && amountCents < 0) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'amount_cents must be >= 0',
        });
      }
      const rawCurrency = body.currency;
      const currency =
        rawCurrency != null && typeof rawCurrency === 'string' && VALID_CURRENCIES.includes(rawCurrency.toLowerCase() as any)
          ? rawCurrency.toLowerCase()
          : amountCents != null ? 'eur' : null;

      // ── Availability enforcement ──────────────────────────────────────────
      // Uses getCalendarConflicts() (confirmed/modified bookings + external calendar).
      // If any conflict exists → 409. No booking created.
      try {
        await validateAvailability({
          instructorId,
          startUtc: startTime,
          endUtc: endTime,
        });
      } catch (availErr) {
        if (availErr instanceof AvailabilityConflictError) {
          return reply.status(409).send({
            ok: false,
            error: ERROR_CODES.AVAILABILITY_CONFLICT,
            message: 'Time slot not available: conflicts with existing booking or calendar event',
            conflicts: availErr.conflicts,
          });
        }
        throw availErr;
      }

      // createBooking() uses SELECT FOR UPDATE inside a transaction to prevent
      // race-condition double bookings. If a concurrent request wins, this throws
      // AvailabilityConflictError — same as the pre-check above.
      let created: { id: string };
      try {
        created = await createBooking({
          instructorId,
          customerId,
          customerName,
          startTime,
          endTime,
          serviceId: serviceId || undefined,
          meetingPointId: meetingPointId || undefined,
          notes: notes ?? undefined,
          durationMinutes,
          partySize,
          skillLevel,
          amountCents,
          currency,
        });
      } catch (createErr) {
        if (createErr instanceof AvailabilityConflictError) {
          return reply.status(409).send({
            ok: false,
            error: ERROR_CODES.AVAILABILITY_CONFLICT,
            message: 'Time slot not available: concurrent booking conflict',
          });
        }
        throw createErr;
      }
      await insertAuditEvent({
        actor_type: 'instructor',
        actor_id: instructorId,
        action: 'booking_created',
        entity_type: 'booking',
        entity_id: created.id,
        payload: { bookingId: created.id, customerId },
      }).catch(() => { /* fail-open */ });
      return reply.status(201).send({ id: created.id });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/submit — draft → pending
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/submit', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const updated = await applyTransition(booking.id, booking.status, 'pending', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/accept — pending → confirmed
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/accept', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const updated = await applyTransition(booking.id, booking.status, 'confirmed', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/reject — pending → declined
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/reject', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const updated = await applyTransition(booking.id, booking.status, 'declined', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/modify — confirmed → modified | modified → modified
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/modify', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const updated = await applyTransition(booking.id, booking.status, 'modified', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/cancel — confirmed | modified → cancelled.
  // Uses current DB status (so Edit→Save→Cancel correctly yields modified→cancelled in timeline).
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/cancel', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId, billingStatus } = ctx;
      if (!isPilotInstructor(instructorId)) {
        return reply.status(402).send({
          ok: false,
          error: ERROR_CODES.PILOT_ONLY,
          message: 'This feature is only available for pilot instructors.',
        });
      }
      const billingBlock = checkBillingGate(billingStatus);
      if (billingBlock) {
        return reply.status(402).send({ ok: false, error: billingBlock.error, message: billingBlock.message });
      }
      const updated = await applyTransition(booking.id, booking.status, 'cancelled', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // POST /instructor/bookings/:id/complete — confirmed | modified → completed (lesson delivered).
  // completed is terminal: no further transitions allowed.
  app.post<{ Params: { id: string } }>('/instructor/bookings/:id/complete', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const updated = await applyTransition(booking.id, booking.status, 'completed', instructorId);
      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // PATCH /instructor/bookings/:id — edit details (ownership enforced). Never accept status or instructorId from client.
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/instructor/bookings/:id', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId, billingStatus } = ctx;
      if (!isPilotInstructor(instructorId)) {
        return reply.status(402).send({
          ok: false,
          error: ERROR_CODES.PILOT_ONLY,
          message: 'This feature is only available for pilot instructors.',
        });
      }
      const billingBlock = checkBillingGate(billingStatus);
      if (billingBlock) {
        return reply.status(402).send({ ok: false, error: billingBlock.error, message: billingBlock.message });
      }
      const body = (request.body ?? {}) as Record<string, unknown>;

      const hasCustomerField =
        body.customer_id !== undefined ||
        body.customerId !== undefined ||
        body.customer_name !== undefined ||
        body.customerName !== undefined;
      if (hasCustomerField) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'Editing customer on a booking is not allowed; customer is set at creation',
        });
      }

      const startTime =
        body.start_time !== undefined ? String(body.start_time).trim() : body.startTime !== undefined ? String(body.startTime).trim() : undefined;
      const endTime =
        body.end_time !== undefined ? String(body.end_time).trim() : body.endTime !== undefined ? String(body.endTime).trim() : undefined;
      const serviceId =
        body.service_id !== undefined ? (body.service_id === null ? null : String(body.service_id)) : body.serviceId !== undefined ? (body.serviceId === null ? null : String(body.serviceId)) : undefined;
      const meetingPointId =
        body.meeting_point_id !== undefined
          ? (body.meeting_point_id === null ? null : String(body.meeting_point_id))
          : body.meetingPointId !== undefined
            ? (body.meetingPointId === null ? null : String(body.meetingPointId))
            : undefined;
      const notes = body.notes !== undefined ? (body.notes === null ? null : String(body.notes)) : undefined;

      const effectiveStart = startTime ?? (booking.start_time != null ? String(booking.start_time) : null);
      const effectiveEnd = endTime ?? (booking.end_time != null ? String(booking.end_time) : null);
      if (effectiveStart != null && effectiveEnd != null) {
        const s = new Date(effectiveStart).getTime();
        const e = new Date(effectiveEnd).getTime();
        if (Number.isNaN(s) || Number.isNaN(e) || s >= e) {
          return reply.status(400).send({
            ok: false,
            error: ERROR_CODES.INVALID_PAYLOAD,
            message: 'start_time must be before end_time',
          });
        }
      }

      const patch: UpdateBookingDetailsPatch = {};
      if (startTime !== undefined) patch.start_time = startTime;
      if (endTime !== undefined) patch.end_time = endTime;
      if (serviceId !== undefined) patch.service_id = serviceId === '' ? null : serviceId;
      if (meetingPointId !== undefined) patch.meeting_point_id = meetingPointId === '' ? null : meetingPointId;
      if (notes !== undefined) patch.notes = notes;

      if (Object.keys(patch).length === 0) {
        return reply.send(booking);
      }

      // Timeline policy (Option A): only confirmed → modified creates an audit event. If already modified,
      // only update details — no applyTransition, so no noisy modified→modified timeline entries.
      const currentStatus = String(booking.status);
      const needTransition = currentStatus === 'confirmed' && Object.keys(patch).length > 0;
      if (needTransition) {
        await applyTransition(booking.id, currentStatus, 'modified', instructorId);
      }
      const updated = await updateBookingDetails(booking.id, instructorId, patch);
      if (!updated) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.BOOKING_NOT_FOUND,
          message: 'Booking not found',
        });
      }
      await insertAuditEvent({
        actor_type: 'instructor',
        actor_id: instructorId,
        action: 'booking_details_updated',
        entity_type: 'booking',
        entity_id: booking.id,
        payload: { bookingId: booking.id },
      }).catch(() => { /* fail-open */ });
      return reply.send(updated);
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // PATCH /instructor/bookings/:id/status — set status with transition validation (ownership enforced)
  app.patch<{ Params: { id: string }; Body: { status?: string } }>('/instructor/bookings/:id/status', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;
      const body = request.body ?? {};
      const nextStatus = typeof body.status === 'string' ? body.status.trim() : '';

      const allowed: string[] = ['draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined', 'completed'];
      if (!allowed.includes(nextStatus)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: `status must be one of: ${allowed.join(', ')}`,
        });
      }

      transitionBookingState(booking.status as any, nextStatus as any);

      const updated = await updateBookingStatus(booking.id, instructorId, nextStatus as any);
      if (!updated) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.BOOKING_NOT_FOUND,
          message: 'Booking not found',
        });
      }

      await recordBookingAudit({
        bookingId: booking.id,
        previousState: booking.status as any,
        newState: nextStatus as any,
        actor: 'human',
      });

      return reply.send({ ok: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // DELETE /instructor/bookings/:id — soft delete (status = cancelled), ownership enforced
  app.delete<{ Params: { id: string } }>('/instructor/bookings/:id', async (request, reply) => {
    try {
      const ctx = await loadBookingAndEnforceOwnership(request, reply);
      if (!ctx) return;
      const { booking, instructorId } = ctx;

      const updated = await deleteBooking(booking.id, instructorId);
      if (!updated) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.BOOKING_NOT_FOUND,
          message: 'Booking not found',
        });
      }

      if (booking.status !== 'cancelled') {
        await recordBookingAudit({
          bookingId: booking.id,
          previousState: booking.status as any,
          newState: 'cancelled' as any,
          actor: 'human',
        });
      }

      return reply.send({ ok: true, deleted: true, booking: updated });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}
