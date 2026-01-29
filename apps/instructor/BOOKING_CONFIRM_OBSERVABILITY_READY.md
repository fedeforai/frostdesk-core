# Booking Confirm Observability — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23

## Scope (What it IS)

- Instructor can view booking audit log entries (booking_audit_log)
- Data is read from persisted DB state only
- Shows raw audit rows for human verification and accountability

## Surfaces Included

- Endpoint: GET /instructor/booking-audit-logs
- UI Page: /instructor/booking-audit-logs
- Table component: BookingAuditLogsTable (read-only)

## What it DOES

- READ last 50 audit log rows for the authenticated instructor
- Display: created_at, action, booking_id, request_id
- Provide transparency on "human-confirmed booking creation"

## What it DOES NOT DO (NON-NEGOTIABLE)

- No booking creation
- No booking edits
- No availability validation
- No calendar checks
- No Stripe
- No automation triggers
- No retries
- No caching
- No enrichment, scoring, ranking, or filtering beyond instructor_id + limit
- No AI calls
- No inference
- No side effects
- No logging beyond existing persisted audit rows

## Architectural Guarantees

- Repository: SELECT only
- Service: pass-through only
- Edge Function: GET-only, auth enforced, returns raw array
- Frontend: Server Component fetch once, pure presentation table

## Relationship to 13.3.4 (Confirm Backend)

- This layer is observational only
- It reads the immutable audit log written by the confirm backend bridge
- It does not participate in confirmation or booking creation

## Change Policy

- Any change requires:
  - PRD update
  - scope review
  - versioned update to this freeze marker
- No silent changes allowed

## Final Statement

Confirm observability is frozen to preserve explainability, auditability, and reversibility.
