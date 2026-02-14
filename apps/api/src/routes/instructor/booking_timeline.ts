/**
 * Loop 6: Decision timeline for a booking (read-only).
 * GET /instructor/bookings/:id/timeline
 */

import type { FastifyInstance } from 'fastify';
import {
  getBookingInstructorId,
  getBookingTimeline,
  getInstructorProfileByUserId,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as any).code = ERROR_CODES.NOT_FOUND;
    throw e;
  }
  return profile.id;
}

export async function instructorBookingTimelineRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/instructor/bookings/:id/timeline',
    async (request, reply) => {
      try {
        const instructorId = await getInstructorId(request);
        const bookingId = (request.params as { id: string }).id;

        const bookingOwnerId = await getBookingInstructorId(bookingId);
        if (bookingOwnerId === null) {
          return reply.status(404).send({
            ok: false,
            error: ERROR_CODES.BOOKING_NOT_FOUND,
            message: 'Booking not found',
          });
        }
        if (bookingOwnerId !== instructorId) {
          return reply.status(403).send({
            ok: false,
            error: ERROR_CODES.FORBIDDEN,
            message: 'You do not own this booking',
          });
        }

        const timeline = await getBookingTimeline(bookingId);
        return reply.send({
          booking_id: bookingId,
          timeline,
        });
      } catch (err) {
        const normalized = normalizeError(err);
        return reply
          .status(mapErrorToHttp(normalized.error))
          .send({ ok: false, error: normalized.error, message: normalized.message });
      }
    }
  );
}
