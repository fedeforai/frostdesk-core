/**
 * Calendar: conflicts (read-only), Google connect/sync (stub), availability slots.
 * All times UTC. No sensitive event details stored or logged.
 */

import type { FastifyInstance } from 'fastify';
import {
  getCalendarConflicts,
  getInstructorProfileByUserId,
  getBookingInstructorId,
  computeSellableSlots,
  getCalendarConnection,
  upsertCalendarConnection,
  updateCalendarConnectionSync,
  deleteExternalBusyBlocksByConnection,
  upsertExternalBusyBlock,
  listInstructorEvents,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';
import { fetchGoogleBusyEvents } from '../../lib/google_calendar_sync.js';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as Error & { code: string }).code = ERROR_CODES.NOT_FOUND;
    throw e;
  }
  return profile.id;
}

export async function instructorCalendarRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { dateFrom?: string; dateTo?: string };
  }>('/instructor/calendar/events', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const { dateFrom, dateTo } = request.query;
      const events = await listInstructorEvents(
        instructorId,
        dateFrom?.trim() || undefined,
        dateTo?.trim() || undefined
      );
      return reply.send(events);
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  app.get('/instructor/calendar/connection', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const connection = await getCalendarConnection(instructorId, 'google');
      if (!connection) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'No calendar connection',
        });
      }
      return reply.send({
        ok: true,
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        last_sync_at: connection.last_sync_at,
        calendar_id: null,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  app.get<{
    Querystring: { start_time?: string; end_time?: string; booking_id?: string };
  }>('/instructor/calendar/conflicts', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const { start_time, end_time, booking_id } = request.query;

      if (!start_time || typeof start_time !== 'string' || !start_time.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'start_time (UTC ISO) is required',
        });
      }
      if (!end_time || typeof end_time !== 'string' || !end_time.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'end_time (UTC ISO) is required',
        });
      }

      const startMs = new Date(start_time).getTime();
      const endMs = new Date(end_time).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'start_time and end_time must be valid ISO 8601',
        });
      }
      if (startMs >= endMs) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'start_time must be before end_time',
        });
      }

      if (booking_id && typeof booking_id === 'string' && booking_id.trim()) {
        const ownerId = await getBookingInstructorId(booking_id.trim());
        if (ownerId === null) {
          return reply.status(404).send({
            ok: false,
            error: ERROR_CODES.BOOKING_NOT_FOUND,
            message: 'Booking not found',
          });
        }
        if (ownerId !== instructorId) {
          return reply.status(403).send({
            ok: false,
            error: ERROR_CODES.FORBIDDEN,
            message: 'Not authorized to access this booking',
          });
        }
      }

      const conflicts = await getCalendarConflicts({
        instructorId,
        startTimeUtc: start_time.trim(),
        endTimeUtc: end_time.trim(),
        excludeBookingId: booking_id?.trim() || null,
      });

      const has_conflicts = conflicts.length > 0;
      return reply.send({
        has_conflicts,
        conflicts,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({
        ok: false,
        error: normalized.error,
        message: normalized.message,
      });
    }
  });

  // --- POST /instructor/calendar/connect/google (stub: store connection record) ---
  app.post<{ Body?: { status?: string } }>('/instructor/calendar/connect/google', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const status = (request.body?.status as string) ?? 'pending';
      const allowed = ['pending', 'connected', 'error', 'disconnected'];
      if (!allowed.includes(status)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'status must be one of: ' + allowed.join(', '),
        });
      }
      const connection = await upsertCalendarConnection({
        instructor_id: instructorId,
        provider: 'google',
        status,
      });
      return reply.send({
        ok: true,
        connection_id: connection.id,
        provider: connection.provider,
        status: connection.status,
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

  // --- POST /instructor/calendar/disconnect (set status disconnected, clear busy blocks) ---
  app.post('/instructor/calendar/disconnect', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const connection = await getCalendarConnection(instructorId, 'google');
      if (!connection) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Google calendar not connected.',
        });
      }
      await deleteExternalBusyBlocksByConnection(connection.id);
      await upsertCalendarConnection({
        instructor_id: instructorId,
        provider: 'google',
        status: 'disconnected',
      });
      return reply.send({ ok: true, message: 'Disconnected' });
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

  // --- POST /instructor/calendar/sync/google (fetch busy events, upsert external_busy_blocks) ---
  app.post<{ Body?: { from?: string; to?: string } }>('/instructor/calendar/sync/google', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const connection = await getCalendarConnection(instructorId, 'google');
      if (!connection) {
        return reply.status(404).send({
          ok: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Google calendar not connected. Call connect first.',
        });
      }
      const now = new Date();
      const toUtc = request.body?.to ?? now.toISOString();
      const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fromUtc = request.body?.from ?? fromDate.toISOString();
      const fromMs = new Date(fromUtc).getTime();
      const toMs = new Date(toUtc).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'from and to must be valid UTC ISO strings with from < to',
        });
      }
      const events = await fetchGoogleBusyEvents(connection, fromUtc, toUtc);
      await deleteExternalBusyBlocksByConnection(connection.id);
      for (const ev of events) {
        await upsertExternalBusyBlock({
          instructor_id: instructorId,
          connection_id: connection.id,
          external_id: ev.external_id,
          provider: 'google',
          start_utc: ev.start_utc,
          end_utc: ev.end_utc,
          status: 'busy',
        });
      }
      await updateCalendarConnectionSync(connection.id, null);
      const updated = await getCalendarConnection(instructorId, 'google');
      return reply.send({
        ok: true,
        synced_events: events.length,
        last_sync_at: updated?.last_sync_at ?? null,
        sync_status: updated?.status ?? null,
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

  // --- GET /instructor/availability/slots?from=...&to=... (computed sellable slots) ---
  app.get<{ Querystring: { from?: string; to?: string } }>('/instructor/availability/slots', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const { from, to } = request.query;
      if (!from || typeof from !== 'string' || !from.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'from (UTC ISO) is required',
        });
      }
      if (!to || typeof to !== 'string' || !to.trim()) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.MISSING_PARAMETERS,
          message: 'to (UTC ISO) is required',
        });
      }
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'from and to must be valid ISO 8601',
        });
      }
      if (fromMs >= toMs) {
        return reply.status(400).send({
          ok: false,
          error: ERROR_CODES.INVALID_PAYLOAD,
          message: 'from must be before to',
        });
      }
      const slots = await computeSellableSlots({
        instructorId,
        fromUtc: from.trim(),
        toUtc: to.trim(),
      });
      const googleConnection = await getCalendarConnection(instructorId, 'google');
      return reply.send({
        ok: true,
        slots: slots.map((s) => ({ start_utc: s.start_utc, end_utc: s.end_utc })),
        calendar_sync: googleConnection
          ? {
              last_sync_at: googleConnection.last_sync_at,
              sync_status: googleConnection.status,
            }
          : null,
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
