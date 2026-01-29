# AI Booking Confirm Backend — Audited Contract

Status: FROZEN
Date: 2026-01-23

## Scope
Create a real booking from a human-confirmed AI draft, with mandatory audit logging.

## Guarantees
- No AI model calls
- No availability validation
- No calendar conflict checks
- No Stripe
- No automation triggers
- Booking creation and audit insert are atomic (single transaction)
- Idempotency via (instructor_id, request_id)

## Required Inputs
- confirmed: true
- requestId
- startTime, endTime
- draftPayload (stored verbatim)

## Output
- bookingId

## Change Policy
Any change requires PRD update, scope review, and versioned updates to this file.
