import { FastifyInstance } from 'fastify';
import { getBookingLifecycleAdmin, BookingNotFoundError, isValidUUID } from '@frostdesk/db';
import { requireAdminUser } from '../../lib/auth_instructor.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';
import { ERROR_CODES } from '../../errors/error_codes.js';

/**
 * Admin Booking Lifecycle Routes (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - Exposes GET /admin/bookings/:bookingId/lifecycle endpoint
 * - Enforces admin access via service layer
 * - Returns booking lifecycle read model
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No SQL
 * - No business logic
 * - No direct repository calls
 */

export async function adminBookingLifecycleRoutes(app: FastifyInstance) {
  app.get('/admin/bookings/:bookingId/lifecycle', async (request, reply) => {
    try {
      const userId = await requireAdminUser(request);
      const { bookingId } = request.params as { bookingId?: string };

      // Validate bookingId parameter
      if (!bookingId || typeof bookingId !== 'string' || bookingId.trim().length === 0) {
        const normalized = normalizeError({ code: ERROR_CODES.MISSING_PARAMETERS });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Booking ID is required',
          },
        });
      }

      // Validate UUID format
      if (!isValidUUID(bookingId)) {
        const normalized = normalizeError({ code: ERROR_CODES.INVALID_PAYLOAD });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Invalid booking ID format',
          },
        });
      }

      // Call service (admin guard enforced inside service)
      const lifecycle = await getBookingLifecycleAdmin(bookingId, userId);

      // Contract validation: ensure events is always an array
      if (!Array.isArray(lifecycle)) {
        const normalized = normalizeError({ code: ERROR_CODES.INTERNAL_ERROR });
        const httpStatus = mapErrorToHttp(normalized.error);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: normalized.error,
            message: normalized.message || 'Invalid lifecycle data format',
          },
        });
      }

      // Empty lifecycle is valid: return empty array
      return reply.send({
        ok: true,
        events: lifecycle,
      });
    } catch (error) {
      // Handle BookingNotFoundError explicitly
      if (error instanceof BookingNotFoundError) {
        const httpStatus = mapErrorToHttp(ERROR_CODES.BOOKING_NOT_FOUND);
        return reply.status(httpStatus).send({
          ok: false,
          error: {
            code: ERROR_CODES.BOOKING_NOT_FOUND,
            message: error.message || 'Booking not found',
          },
        });
      }

      // Normalize all other errors
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: {
          code: normalized.error,
          message: normalized.message || 'Unable to fetch booking lifecycle',
        },
      });
    }
  });
}
