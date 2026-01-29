# Availability — READY (Frozen)

**Status:** Frozen  
**Scope:** Instructor Availability  
**Date:** 2026-01-23

## Definition

Availability represents the explicit time windows in which an instructor declares they are open to receive bookings.

It is:

- Manually defined by the instructor
- Explicit and deterministic
- Independent from calendar events
- Independent from bookings
- Independent from AI

## Guarantees

The system guarantees that:

- Availability is never inferred
- Availability is never auto-corrected
- Availability is never modified by AI
- Availability is never modified by bookings
- Availability is never modified by calendar sync
- Availability changes only via Instructor UI

## What Availability IS used for

- Slot proposal by AI
- Validation of booking requests
- Human understanding of instructor schedule

## What Availability is NOT

- A reflection of calendar busy slots
- A computed schedule
- A merged view with external calendars
- An automated optimization system

## Change Policy

No changes to availability logic, schema, or behavior are allowed without:

- PRD update
- Explicit scope review
- Manual approval

---

Availability is now a stable input layer.
