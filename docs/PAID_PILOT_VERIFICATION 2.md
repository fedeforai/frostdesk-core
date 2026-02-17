# Paid pilot verification – instructor product

**Goal:** Verify instructor product is "paid pilot safe" after planned fixes.  
**Method:** Repo evidence only (file paths, code, migrations). No new libraries; no auth/proxy changes.

---

## A) Pass/Fail per checklist item + file evidence

### 1) Booking status alignment

**Result: FAIL**

**Evidence:**

- **`packages/db/src/booking_state_machine.ts`** (lines 1, 32–38):  
  - `BookingState = 'draft' | 'proposed' | 'confirmed' | 'cancelled' | 'expired'`.  
  - Transitions: `draft → proposed`, `proposed → confirmed | expired`, `confirmed → cancelled`.  
  - **Does not use:** `pending`, `modified`, `declined`.

- **`supabase/migrations/20260208140000_booking_status_constraint_extend.sql`** (lines 25–27):  
  - `CHECK (status IN ('draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined'))`.  
  - **Uses:** `pending`, `modified`, `declined`. **Does not allow:** `proposed`, `expired`.

- **`apps/api/src/routes/instructor/bookings.ts`** (lines 98, 113, 128, 143, 158):  
  - Uses `'pending'`, `'confirmed'`, `'declined'`, `'modified'`, `'cancelled'` in `applyTransition(..., 'pending'|'confirmed'|...)`.  
  - Calls `transitionBookingState(currentState as any, nextState as any)` — at runtime this would throw for `draft → pending` because the state machine only allows `draft → proposed`.

- **`apps/api/src/routes/admin.ts`** (lines 163–187):  
  - Admin override uses `adminOverrideBookingStatus` with `newStatus` from body; no constraint in this file. Status validity depends on DB CHECK and downstream code.

**Conclusion:** DB and instructor API use `draft | pending | confirmed | cancelled | modified | declined`. The state machine still uses `proposed` and `expired` and does not allow `pending`, `modified`, or `declined`. Status enums and transitions do **not** match the DB CHECK. Planned fix (align state machine to DB) has **not** been applied.

---

### 2) Bookings API surface

**Result: FAIL**

**Evidence:**

- **`apps/api/src/routes/instructor.ts`** (lines 1–35):  
  - Registers: profile, dashboard, availability, slots, calendar, services, meeting_points, policies_document, guardrails, whatsapp, inbox, conversations, drafts, reply.  
  - **Does not register** `instructorBookingRoutes` or any booking route. No `import` or `fastify.register` for bookings.

- **`apps/api/src/routes/instructor/bookings.ts`**:  
  - Defines only POST handlers: `/instructor/bookings/:id/submit`, `accept`, `reject`, `modify`, `cancel`.  
  - **No** `app.get('/instructor/bookings', ...)` (list).  
  - **No** `app.get('/instructor/bookings/:id', ...)` (detail).  
  - **No** `app.post('/instructor/bookings', ...)` (create).

So even if booking routes were registered:

- **GET /api/instructor/bookings** — not implemented (no list endpoint).  
- **GET /api/instructor/bookings/:id** — not implemented (no detail endpoint).  
- **POST /api/instructor/bookings** — not implemented (no create endpoint).

Proxy path `/api/instructor/bookings` would 404 for GET/POST because the routes are neither registered nor defined. Instructor app currently uses Edge (`/functions/v1/instructor/bookings`) for list/detail/create.

**Conclusion:** Bookings routes are **not** registered; list/detail/create are **not** implemented on Fastify. Proxy path for GET/POST bookings does **not** work.

---

### 3) Instructor takeover (ai_state)

**Result: FAIL**

**Evidence:**

- **`apps/api/src/routes/admin/conversation_ai_state.ts`** (line 20):  
  - Only route found: `app.patch('/admin/conversations/:id/ai-state', ...)`.  
  - Admin-only; uses `requireAdminUser(request)`.

- **Instructor routes:**  
  - `grep -r "ai-state\|ai_state" apps/api/src/routes/instructor` → no matches.  
  - No PATCH `/instructor/conversations/:id/ai-state` (or similar) in instructor routes.

- **Instructor app UI:**  
  - No call to an instructor ai-state endpoint found in the checklist scope; inbox uses reply/drafts, not ai_state PATCH.

**Conclusion:** There is **no** instructor route for PATCH `/instructor/conversations/:id/ai-state`. Only admin can change ai_state. Instructor takeover (instructor-scoped ai_state change) has **not** been implemented.

---

### 4) Profile timezone (legacy)

**Result: FAIL**

**Evidence:**

- **`packages/db/src/instructor_profile_repository.ts`**  
  - **GET (user_id path)** — lines 134–139:  
    - `SELECT id, full_name, base_resort, working_language, contact_email, onboarding_completed_at, display_name, slug, COALESCE(languages, ...), COALESCE(marketing_fields, ...), COALESCE(operational_fields, ...)`.  
    - **No `timezone`** in the SELECT.  
  - **Extended params** — lines 47–59:  
    - `UpdateInstructorProfileByUserIdExtendedParams`: `userId`, `full_name`, `base_resort`, `working_language`, `contact_email`, `languages`, `display_name`, `slug`, `marketing_fields`, `operational_fields`.  
    - **No `timezone`** in the interface.  
  - **Extended update** — lines 255–268:  
    - `UPDATE instructor_profiles SET full_name, base_resort, working_language, contact_email, updated_at, display_name, slug, languages, marketing_fields, operational_fields`.  
    - **No `timezone`** in SET.  
  - Legacy fallback (id = userId) returns `getInstructorProfile(userId)` which also does not select timezone (see `getInstructorProfile` SELECT).

- **`apps/api/src/routes/instructor/profile.ts`**  
  - **Legacy GET response** — lines 205–219:  
    - Sends: id, full_name, base_resort, working_language, contact_email, languages, display_name, slug, onboarding_completed_at, marketing_fields, operational_fields.  
    - **No `timezone`** in the response.  
  - **Legacy PATCH** — `validateLegacyPatch` (lines 58–138):  
    - Accepts: full_name, base_resort, working_language, contact_email, languages, display_name, slug, marketing_fields, operational_fields.  
    - **Does not accept `timezone`.**  
  - Legacy PATCH then calls `updateInstructorProfileByUserIdExtended` with the validated fields; that function does not take or persist timezone.

**Conclusion:** Legacy GET does **not** include timezone. Legacy PATCH does **not** accept or persist timezone. Planned fixes have **not** been applied.

---

### 5) Audit coverage

**Result: PARTIAL (fail on 2 of 4)**

**Evidence:**

| Required audit | Where it should happen | Evidence |
|----------------|------------------------|----------|
| **Booking create** | After `createBooking` / `createBookingService` | `packages/db/src/booking_service.ts`: `createBookingService` only calls `createBooking(...)`. No `recordBookingAudit` or `insertAuditEvent`. Edge `supabase/functions/instructor/bookings/index.ts` uses `createBookingService` and does not write audit. **Not done.** |
| **Booking state change** | Instructor/admin booking state transitions | `apps/api/src/routes/instructor/bookings.ts`: `applyTransition` calls `recordBookingAudit` (lines 80–85). Writes to **booking_audit** (see `packages/db/src/booking_audit.ts`). Instructor booking routes are **not registered**, so this path is never hit. Admin override in `admin.ts` (lines 190–202) writes to **audit_log** via `insertAuditEvent` (action `admin_override_booking_status`). **State change audit exists in code** (booking_audit for instructor, audit_log for admin) but instructor path is not mounted. |
| **Instructor takeover ai_state** | When instructor sets ai_state | No instructor ai_state route exists; only admin has PATCH ai-state (and admin path does call `setConversationAiState`, which uses `insertAuditEvent` in `conversation_ai_state_repository.ts`). **Instructor takeover not implemented, so no audit for it.** |
| **Profile identity update** | After profile PATCH (identity fields) | `apps/api/src/routes/instructor/profile.ts`: PATCH handler has no `insertAuditEvent` (or similar). **Not done.** |

**Conclusion:**  
- **audit_log** is used for: admin override booking status, conversation ai_state (admin), handoff, policy, etc.  
- **booking_audit** is used for instructor booking state changes only when `applyTransition` runs (instructor booking routes not registered).  
- **Missing:** audit for booking create; audit for profile identity update; no instructor ai_state change (so no audit for it).

---

## B) Remaining blockers for paid pilot

1. **Booking status mismatch** — `booking_state_machine.ts` still uses `proposed`/`expired`; DB and API use `pending`/`modified`/`declined`. Instructor booking state transitions would throw if routes were enabled.  
2. **Bookings API not exposed** — Instructor booking routes are not registered; GET list/detail and POST create are not implemented on Fastify. Instructor app relies on Edge for bookings.  
3. **No instructor takeover** — No PATCH for instructor to set conversation ai_state; only admin can.  
4. **Profile timezone (legacy)** — Legacy GET and PATCH do not include or persist timezone.  
5. **Audit gaps** — No audit for booking create; no audit for profile identity update; no instructor ai_state change (hence no audit for it).

---

## C) Minimal list of changes if anything still fails (max 5 items)

All five checklist items currently fail or are partial. Minimal change list (max 5, by impact):

| # | Change | File(s) | Acceptance |
|---|--------|--------|------------|
| 1 | **Align booking state machine with DB** | `packages/db/src/booking_state_machine.ts` | Define `BookingState = 'draft' \| 'pending' \| 'confirmed' \| 'cancelled' \| 'modified' \| 'declined'`. Set allowed transitions to match DB/API (e.g. draft→pending, pending→confirmed|declined, confirmed→modified|cancelled, modified→modified|cancelled). Remove `proposed`/`expired` or map them to pending/declined where used. |
| 2 | **Register bookings and add list/detail/create** | `apps/api/src/routes/instructor.ts`; `apps/api/src/routes/instructor/bookings.ts` | In `instructor.ts`: register `instructorBookingRoutes` (and optionally `instructorBookingTimelineRoutes`). In `bookings.ts`: add GET `/instructor/bookings` (list), GET `/instructor/bookings/:id` (detail), POST `/instructor/bookings` (create, then optionally write booking_audit for create). Proxy GET/POST `/api/instructor/bookings` and GET `/api/instructor/bookings/:id` work. |
| 3 | **Instructor ai_state route + UI** | New or existing file under `apps/api/src/routes/instructor/`; instructor app inbox | Add PATCH `/instructor/conversations/:id/ai-state` (body: ai_state). Resolve instructor from JWT; ensure conversation is owned by that instructor; call `setConversationAiState` (writes audit). In instructor inbox UI, add control that calls this endpoint and reflects state. |
| 4 | **Legacy profile timezone** | `packages/db/src/instructor_profile_repository.ts`; `apps/api/src/routes/instructor/profile.ts` | In repository: add `timezone` to SELECT in `getInstructorProfileByUserId`; add `timezone?` to `UpdateInstructorProfileByUserIdExtendedParams` and to UPDATE SET in `updateInstructorProfileByUserIdExtended`. In profile route: include `timezone` in legacy GET response; in `validateLegacyPatch` accept `timezone` and pass to extended update. |
| 5 | **Audit: booking create + profile update** | `packages/db/src/booking_service.ts` or Edge create path; `apps/api/src/routes/instructor/profile.ts` | After successful booking create, call `recordBookingAudit` (or equivalent) for initial state (e.g. draft). On profile PATCH (identity or full), call `insertAuditEvent` with actor_type=instructor, entity_type=instructor, action e.g. profile_identity_update. |

---

**Verification date:** Repo state as of audit.  
**Verdict:** Instructor product is **not** yet "paid pilot safe". All five checklist items need the changes above (or equivalent) before considering it safe for a paid pilot.
