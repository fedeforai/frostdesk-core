import { UnauthorizedError } from '../../../../packages/db/src/admin_access.js';
import { BookingNotFoundError } from '../../../../packages/db/src/booking_repository.js';
import { InvalidBookingTransitionError } from '../../../../packages/db/src/booking_state_machine.js';

export interface AdminErrorResponse {
  error: {
    code: string;
  };
}

/**
 * Maps errors to HTTP status codes and AdminErrorResponse format.
 * 
 * Mapping:
 * - ADMIN_ONLY → 403
 * - BOOKING_NOT_FOUND → 404
 * - INVALID_BOOKING_TRANSITION → 409
 * - default → 500
 * 
 * @param error - Error to map
 * @returns HTTP status code and error response
 */
export function mapErrorToResponse(error: unknown): { status: number; body: AdminErrorResponse } {
  if (error instanceof UnauthorizedError) {
    return {
      status: 403,
      body: { error: { code: 'ADMIN_ONLY' } },
    };
  }

  if (error instanceof BookingNotFoundError) {
    return {
      status: 404,
      body: { error: { code: 'BOOKING_NOT_FOUND' } },
    };
  }

  if (error instanceof InvalidBookingTransitionError) {
    return {
      status: 409,
      body: { error: { code: 'INVALID_BOOKING_TRANSITION' } },
    };
  }

  // Default to 500
  return {
    status: 500,
    body: { error: { code: 'internal_error' } },
  };
}
