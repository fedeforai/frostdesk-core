# Booking state machine – allowed transitions

Aligned with DB constraint: `status IN ('draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined')`.

## Allowed transitions

| From     | To        |
|----------|-----------|
| draft    | pending   |
| pending  | confirmed, declined |
| confirmed| modified, cancelled  |
| modified | modified, cancelled  |
| cancelled| *(terminal)* |
| declined | *(terminal)* |

## Summary

- **draft → pending**: submit (instructor API: POST …/submit).
- **pending → confirmed**: accept (POST …/accept).
- **pending → declined**: reject or expiry (POST …/reject; or system expiry).
- **confirmed → modified**: modify (POST …/modify).
- **confirmed → cancelled**: cancel (POST …/cancel).
- **modified → modified**: modify again.
- **modified → cancelled**: cancel.
- **cancelled**, **declined**: terminal; no outgoing transitions.

Invalid transitions throw `InvalidBookingTransitionError` with code `INVALID_BOOKING_TRANSITION`.
