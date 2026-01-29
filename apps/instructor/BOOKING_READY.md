# BOOKING — HUMAN-TRIGGERED CONTRACT

Status: FROZEN  
Date: 2026-01-23

---

## Scope

This document freezes the Booking Engine in its **human-triggered form**.

Bookings are created, viewed, and listed **only by explicit human action**.
No automation, inference, or AI-driven execution is permitted in this scope.

---

## Supported Capabilities

### Creation
- Booking creation via human form submission
- Explicit user input only
- Fields:
  - instructor_id (derived from auth context)
  - customer_name
  - start_time
  - end_time
  - service_id (optional)
  - meeting_point_id (optional)
  - notes (optional)

### Read
- List instructor bookings (read-only)
- View single booking detail (read-only)

---

## Explicit Guarantees

The following are **guaranteed NOT to exist** in this scope:

- Availability checks
- Availability inference
- Calendar reads or writes
- Calendar synchronization
- Conflict detection
- Automatic corrections
- Time normalization
- AI-generated bookings
- AI-triggered actions
- Stripe or payment logic
- Retries
- Optimistic UI
- Background jobs
- Webhooks
- Side effects

Bookings reflect **persisted system state only**.

---

## AI Safety Declaration

AI systems may:

- Read bookings as static data
- Use bookings as context for explanation or suggestion

AI systems may NOT:

- Create bookings
- Modify bookings
- Cancel bookings
- Confirm bookings
- Infer availability
- Trigger side effects
- Call calendar systems
- Execute autonomous flows

---

## Architectural Boundaries

- Repository: direct INSERT / SELECT only
- Service layer: pass-through with ownership enforcement
- Edge Functions: authenticated, human-triggered
- UI: explicit human interaction only

No layer performs:
- Business logic
- Interpretation
- Inference
- Automation

---

## Change Policy

Any change to this scope requires:

1. PRD update
2. Explicit scope review
3. Manual approval
4. Versioned update of this freeze marker

No implicit extension is allowed.

---

## Next Planned Extensions (NOT ACTIVE)

- Booking AI-assisted suggestions (human confirmation required)
- Availability modeling
- Calendar-aware validation
- Autonomous booking execution

These features are **explicitly out of scope** for this version.

---

## Final Statement

The Booking Engine is:

- Stable
- Predictable
- Human-controlled
- AI-readable
- Safe to extend

No behavior exists outside this contract.
