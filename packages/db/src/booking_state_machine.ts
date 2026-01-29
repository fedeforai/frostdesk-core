export type BookingState = 'draft' | 'proposed' | 'confirmed' | 'cancelled' | 'expired';

export class InvalidBookingTransitionError extends Error {
  code = 'INVALID_BOOKING_TRANSITION';
  
  constructor(currentState: BookingState, nextState: BookingState) {
    super(`Invalid booking state transition: ${currentState} → ${nextState}`);
    this.name = 'InvalidBookingTransitionError';
  }
}

/**
 * Validates and returns the next booking state if transition is allowed.
 * 
 * Allowed transitions:
 * - draft → proposed
 * - proposed → confirmed
 * - proposed → expired
 * - confirmed → cancelled
 * 
 * Any other transition is invalid and throws InvalidBookingTransitionError.
 * 
 * @param currentState - Current booking state
 * @param nextState - Desired next booking state
 * @returns The nextState if transition is valid
 * @throws InvalidBookingTransitionError if transition is invalid
 */
export function transitionBookingState(
  currentState: BookingState,
  nextState: BookingState
): BookingState {
  // Define allowed transitions as a map
  const allowedTransitions: Record<BookingState, BookingState[]> = {
    draft: ['proposed'],
    proposed: ['confirmed', 'expired'],
    confirmed: ['cancelled'],
    cancelled: [],
    expired: [],
  };

  const allowed = allowedTransitions[currentState];
  
  if (!allowed || !allowed.includes(nextState)) {
    throw new InvalidBookingTransitionError(currentState, nextState);
  }

  return nextState;
}
