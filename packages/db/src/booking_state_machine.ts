/**
 * Booking state machine. Aligned with DB CHECK:
 * status IN ('draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined', 'completed')
 */

export type BookingState =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'modified'
  | 'declined'
  | 'completed';

export class InvalidBookingTransitionError extends Error {
  code = 'INVALID_BOOKING_TRANSITION';

  constructor(currentState: BookingState, nextState: BookingState) {
    super(`Invalid booking state transition: ${currentState} → ${nextState}`);
    this.name = 'InvalidBookingTransitionError';
  }
}

/**
 * Allowed transitions for instructor manual overrides.
 *
 * Instructors have full control over their bookings:
 * - draft → pending, confirmed, cancelled
 * - pending → confirmed, declined, cancelled
 * - confirmed → modified, cancelled, completed
 * - modified → confirmed, modified, cancelled, completed
 * - cancelled → draft, pending          (reopen)
 * - declined → draft, pending           (reopen)
 * - completed → (terminal, no outgoing)
 */
const ALLOWED_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  draft: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['modified', 'cancelled', 'completed'],
  modified: ['confirmed', 'modified', 'cancelled', 'completed'],
  cancelled: ['draft', 'pending'],
  declined: ['draft', 'pending'],
  completed: [],
};

/**
 * Validates and returns the next booking state if transition is allowed.
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
  const allowed = ALLOWED_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(nextState)) {
    throw new InvalidBookingTransitionError(currentState, nextState);
  }
  return nextState;
}

/**
 * Returns true if the transition from currentState to nextState is allowed.
 */
export function canTransition(
  currentState: BookingState,
  nextState: BookingState
): boolean {
  const allowed = ALLOWED_TRANSITIONS[currentState];
  return !!allowed && allowed.includes(nextState);
}

/** Terminal states: no outgoing transitions. */
const TERMINAL_STATES: ReadonlySet<BookingState> = new Set(['cancelled', 'declined', 'completed']);

/**
 * Returns true if the state is terminal (cancelled or declined).
 */
export function isTerminal(state: BookingState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Returns true if the booking is still active (not terminal).
 */
export function isActive(state: BookingState): boolean {
  return !TERMINAL_STATES.has(state);
}
