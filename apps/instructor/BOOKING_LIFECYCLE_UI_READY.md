# Booking Lifecycle UI — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23

## Scope

- Instructor can view the complete lifecycle of a single booking
- Displays booking metadata (ID, instructor ID, start time, end time)
- Displays chronological audit log entries (created at, action, booking ID, request ID)
- Data is read from persisted DB state only (bookings + booking_audit_log)
- Shows raw audit rows for human verification and accountability
- End-to-end observability: Repository → Service → Edge Function → Frontend API → UI

## What it DOES

- READ booking lifecycle by bookingId for authenticated instructor
- Display booking metadata: ID, instructor_id, start_time, end_time
- Display audit log timeline: created_at, action, booking_id, request_id
- Provide transparency on "what happened" to a booking
- Enforce ownership via instructorId at all layers
- Return raw data without interpretation or transformation
- Order lifecycle events chronologically (created_at ASC)

## What it DOES NOT DO (NON-NEGOTIABLE)

- No booking creation
- No booking edits
- No booking status changes
- No availability validation
- No calendar checks
- No Stripe integration
- No automation triggers
- No retries
- No caching
- No enrichment, scoring, ranking, or filtering beyond instructor_id + booking_id
- No AI calls
- No inference of booking phase or status
- No status labeling or semantic interpretation
- No side effects
- No logging beyond existing persisted audit rows
- No POST / PUT / DELETE operations
- No buttons or click handlers
- No mutations of any kind

## Architectural Guarantees

**Repository Layer:**
- SELECT only from bookings and booking_audit_log
- Two queries: booking lookup + audit log fetch
- Ownership enforced via instructorId
- Returns raw data structure
- No JOIN, no TRANSACTION, no business logic

**Service Layer:**
- Pure pass-through
- Ownership enforced via userId parameter
- No transformations or mappings

**Edge Function Layer:**
- GET-only endpoint
- Authentication required
- bookingId required via query params
- Returns raw lifecycle object
- No mutations, no validation beyond bookingId presence

**Frontend API Client:**
- GET-only fetch
- Returns raw JSON as received
- Explicit error handling (UNAUTHORIZED, BOOKING_NOT_FOUND, FAILED_TO_LOAD_BOOKING_LIFECYCLE)

**UI Layer:**
- Server Component (no client-side state)
- Pure presentation components (no hooks, no state)
- Raw value display only
- No formatting logic beyond "-" for null values
- No buttons, links, or interactive elements

## Relationship to 13.4.x

- **13.4.1**: Repository read model (SELECT only, raw data)
- **13.4.2**: Service pass-through (ownership enforcement)
- **13.4.3**: Edge Function (GET-only, authentication)
- **13.4.4**: Frontend API client (GET-only fetch)
- **13.4.5**: UI components (pure presentation)

This layer is observational only. It reads the immutable audit log written by the confirm backend bridge (13.3.4). It does not participate in confirmation or booking creation.

## Change Policy

- Any change requires:
  - PRD update
  - Scope review
  - Versioned update to this freeze marker
- No silent changes allowed
- No mutations without explicit authorization
- No new behaviors without freeze marker update

## Final Statement

Booking Lifecycle UI is frozen to preserve explainability, auditability, and reversibility. This feature enables complete end-to-end observability of booking lifecycles without introducing any operational risk or behavioral changes.

**Verification:**
- ✅ Booking lifecycle visible end-to-end
- ✅ Human-readable audit trail
- ✅ No ambiguity about "what happened"
- ✅ Zero operational risk
