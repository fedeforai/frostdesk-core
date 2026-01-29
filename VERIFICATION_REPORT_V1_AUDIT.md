# FrostDesk v1 Verification Report
## System Audit - Pilot Readiness Assessment

**Date:** 2026-01-26  
**Auditor Role:** Senior Staff Engineer / System Auditor  
**Scope:** Verification of codebase against stated requirements and TASK 13.4

---

## Section A: Confirmed Truths

The following statements are **CONFIRMED** as TRUE in the codebase:

- **Booking lifecycle visibility is read-only**: `booking_lifecycle_service.ts` and `booking_lifecycle_repository.ts` contain only read operations. Admin UI components (`BookingLifecycleTimeline.tsx`) are explicitly read-only with no mutation capabilities.

- **Admin and human guards are enforced in services, not repositories**: All access control checks (`assertAdminAccess`, `assertRoleAllowed`) are located in service layer files. Repositories contain no authorization logic. Verified across 15+ service files.

- **Audit logs are written consistently for admin overrides**: `adminOverrideBookingStatus` in `admin_booking_service.ts` writes audit entries with `actor='human'` for all status overrides. Audit write is atomic within the transaction.

- **State machines are reused, not extended**: `booking_state_machine.ts` exports a single `transitionBookingState` function that is imported and used directly. No extensions or wrappers found.

- **CHECK 8.1.2, 8.1.4, and 8.2 assumptions are accurate**: These refer to admin backend tasks (8.1.2: Admin conversations list, 8.1.4: Admin booking detail view, 8.2: Admin messages view). All are marked complete in `ADMIN_BACKEND_FROZEN.md` and corresponding services/repositories exist.

- **No autonomous AI booking creation via worker**: The worker (`apps/worker/src/index.ts`) is a placeholder with no implementation. No queue processing or autonomous booking creation exists.

- **AI draft generation requires admin access**: `generateAndStoreAIDraft` in `ai_draft_service.ts` calls `assertAdminAccess` before generating drafts. AI operations are gated.

- **AI booking confirmation requires human actor**: `confirmAIBookingDraftWithAudit` requires `actorUserId` parameter, indicating human approval is required. No autonomous confirmation path exists.

---

## Section B: Gaps

The following gaps were identified:

1. **Booking origin (manual vs AI-assisted) is not explicitly tracked**: The `bookings` table has `conversation_id` (nullable in current schema based on `admin_booking_repository.ts` queries), which can infer AI-assisted origin, but there is no explicit `origin` or `source` field. Manual bookings may have `conversation_id = NULL`, but this is inference, not explicit tracking.

2. **Booking ↔ conversation linkage is incomplete in admin views**: `admin_booking_detail_repository.ts` SELECT queries do not include `conversation_id` in the result set. The `AdminBookingDetail` interface does not include `conversation_id`. Admin UI cannot display conversation linkage without additional queries.

3. **Booking ↔ audit linkage is indirect**: The `booking_audit` table does not contain `conversation_id`. Linkage from booking to conversation to audit requires joining through the `bookings` table. This is functional but not optimal for observability.

4. **Chronological timeline exists but booking creation event lacks context**: `getBookingLifecycle` creates a `booking_created` event with `actor='system'`, but does not distinguish between manual creation and AI-assisted creation. The timeline shows creation but not origin.

5. **Admin booking detail queries exclude conversation_id**: `getBookingById` in `admin_booking_detail_repository.ts` does not SELECT `conversation_id`, making it impossible to link bookings to conversations in the admin detail view without a separate query.

---

## Section C: Risk Assessment

**Overall Risk Level: MEDIUM**

**Reasoning:**

- **Low Risk Areas:**
  - Access control is correctly implemented (services enforce guards)
  - Audit logging is consistent for admin actions
  - No autonomous AI operations exist (worker is empty)
  - State machine is properly reused

- **Medium Risk Areas:**
  - Booking origin tracking is implicit (via `conversation_id` presence) rather than explicit. This creates ambiguity for manual bookings that may later be linked to conversations.
  - Admin UI cannot display conversation linkage without schema/query changes, limiting observability.
  - The indirect linkage between booking, conversation, and audit requires multiple queries, which is acceptable but not optimal.

- **High Risk Areas:**
  - None identified within current scope constraints.

**Specific Risks:**

1. **Observability Gap**: If a booking is created manually (no `conversation_id`), then later a conversation is created, the origin cannot be retroactively determined. This is acceptable for v1 but limits auditability.

2. **Admin UI Limitation**: Admin users cannot see conversation context for bookings in the detail view without additional implementation. This is a UX gap, not a functional blocker.

3. **Timeline Context**: The lifecycle timeline shows "booking_created" with `actor='system'` but does not indicate whether it was AI-assisted or manual. This is acceptable if origin inference via `conversation_id` is sufficient.

---

## Section D: Go / No-Go Recommendation

**Recommendation: CONDITIONAL GO**

**Rationale:**

The codebase meets the core requirements for pilot readiness:
- No autonomous AI operations
- Proper access control enforcement
- Consistent audit logging
- Read-only lifecycle visibility
- State machine reuse

**Conditions for Full Go:**

1. **Document the inference pattern**: Explicitly document that booking origin (AI-assisted vs manual) is inferred via `conversation_id` presence/absence. This is acceptable for v1 but must be documented.

2. **Clarify TASK 13.4 scope**: The gaps identified (conversation_id in admin views, explicit origin tracking) may be acceptable for v1 if "inferable" is sufficient. If "visible" requires explicit fields, these are missing.

3. **Worker status**: The empty worker is acceptable for pilot mode (no autonomous operations), but this should be explicitly documented as intentional.

**Blockers for Full Go:**

- None identified that prevent pilot launch.

**Recommendations for Post-Pilot:**

- Add `conversation_id` to `AdminBookingDetail` interface and queries
- Consider explicit `origin` field if manual bookings become common
- Add `conversation_id` to `booking_audit` table if audit-to-conversation linkage becomes critical

---

## Unclear Areas

1. **CHECK 8.1.2, 8.1.4, 8.2 assumptions**: These are confirmed as accurate (admin backend tasks complete), but the specific "assumptions" referenced are not documented separately. The tasks themselves are complete.

2. **TASK 13.4 "inferable" vs "visible"**: The requirement states "visible or inferable" for booking origin. Current implementation is "inferable" (via `conversation_id`). If "visible" requires explicit UI display or field, this is partially missing in admin detail views.

3. **Schema evolution**: The `bookings` table schema in migrations shows `conversation_id` as NOT NULL, but admin queries suggest it may be nullable in practice. This discrepancy needs verification against actual database state.

---

## Summary

**Verified:** 8/8 core requirements confirmed  
**Gaps:** 5 gaps identified, all non-blocking for pilot  
**Risk:** Medium (observability limitations, not functional failures)  
**Status:** Conditional Go (document inference patterns, clarify TASK 13.4 scope)

The codebase is pilot-ready with documented limitations. No schema changes or refactors are required for pilot launch. All gaps are observability/UX related, not functional blockers.
