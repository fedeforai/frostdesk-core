# Instructor product – PMF readiness audit (repo evidence only)

**Context:** `pnpm dev:instructor`; goal = assess if instructor product is PMF-ready for paid pilots.  
**Constraints:** No architecture/route/proxy/auth changes; no new libraries; audit + minimal fix plan only (no code written).

**Audit date:** Repo state as of audit (post-PR2/PR4/PR5). Evidence from file paths, code, DB migrations, API contracts only.

---

## 1) Critical user journey map (instructor)

| Step | UI page/component | API call | Backend route handler | DB / repositories |
|------|-------------------|----------|------------------------|-------------------|
| **Login** | `apps/instructor/app/instructor/(pre)/login/page.tsx`, `LoginForm.tsx` | Supabase Auth (cookies) | N/A (Supabase Auth) | `auth.users` (Supabase) |
| **Approval gate** | `apps/instructor/app/instructor/(pre)/gate/page.tsx` | Supabase client `.from('instructor_profiles').select(...)` | N/A (direct Supabase from server component) | `instructor_profiles` (approval_status, onboarding_status, profile_status) |
| **Onboarding** | `(pre)/onboarding/page.tsx`, `(pre)/onboarding/form/page.tsx`, `components/onboarding/InstructorOnboardingForm.tsx` | Supabase client upsert; `CompleteOnboardingButton` → update | N/A (direct Supabase) | `instructor_profiles` (onboarding_status, profile_status, onboarding_payload) |
| **Dashboard** | `(app)/dashboard/page.tsx` → `InstructorDashboardClient.tsx`, `HomeDashboard.tsx` | `fetchInstructorDashboardViaApi()` → GET `/api/instructor/dashboard`; `getConversations()`, `getKpiSummary()` | `apps/api/src/routes/instructor/dashboard.ts`, `conversations.ts`, drafts (kpis) | `getInstructorDashboardData`, `getInstructorInbox`; dashboard repo uses `instructor_*` + `bookings` for upcomingBookings |
| **Profile editor** | `(app)/profile/page.tsx`, `components/ProfileForm.tsx` | GET/PATCH `/api/instructor/profile` | `apps/api/src/routes/instructor/profile.ts` | `getInstructorProfileDefinitiveByUserId` / `getInstructorProfileByUserId`, `patchInstructorProfileByUserId` / `updateInstructorProfileByUserIdExtended` |
| **Services** | `(app)/services/page.tsx` | `getApiBaseUrl()/instructor/services` (proxy) | `apps/api/src/routes/instructor/services.ts` | `instructor_services` |
| **Availability** | `(app)/availability/page.tsx` | GET/POST/PATCH `/api/instructor/availability*` | `availability.ts` | `instructor_availability` |
| **Inbox** | `(app)/inbox/page.tsx`, `[conversationId]/page.tsx`, `HumanInboxPage.tsx`, `InstructorInboxClient.tsx` | `fetchInstructorInbox()`, `getConversations()`, `getMessages()`, `sendInstructorReply()` → `/api/instructor/*` | `inbox.ts`, `conversations.ts`, `reply.ts` | `getInstructorInbox`, messages, reply |
| **Booking list/detail/create** | `(app)/bookings/page.tsx`, `(app)/bookings/[bookingId]/page.tsx`, `(app)/bookings/new/page.tsx`, `BookingForm.tsx` | **Client:** `fetchInstructorBookings()`, `fetchInstructorBooking(id)`, `createInstructorBooking()` → **proxy** `getApiBaseUrl()/instructor/bookings`. **Server:** `fetchInstructorBookingsServer()`, `fetchInstructorBookingServer()` → **proxy** `getApiBaseUrl()/instructor/bookings` | **Gap:** Fastify has **no** GET `/instructor/bookings`, GET `/instructor/bookings/:id`, or POST `/instructor/bookings`. Only POST submit/accept/reject/modify/cancel and GET timeline are in `bookings.ts` / `booking_timeline.ts`. Proxy forwards to Fastify → **404** for list/detail/create. | `packages/db`: `listInstructorBookings`, `getBookingById`, `createBooking` exist but are **not** wired in Fastify for list/detail/create |

**Summary:** Profile, dashboard, services, availability, inbox, conversations, reply use proxy → Fastify. **Bookings:** instructor app calls **proxy** for list/detail/create (PR5), but **Fastify does not implement** those three endpoints; only transition actions (submit/accept/reject/modify/cancel) and GET timeline are implemented. So list/detail/create currently **404** when using proxy.

---

## 2) Edge Functions vs Fastify proxy

### Edge Function calls (file path + function name)

From **`apps/instructor/lib/instructorApi.ts`** (session + `NEXT_PUBLIC_SUPABASE_URL/functions/v1/...`):

| File | Function / URL |
|------|-----------------|
| `instructorApi.ts` | `fetchInstructorDashboard()` → GET `/functions/v1/instructor/dashboard` |
| `instructorApi.ts` | Policies: GET/PATCH `/functions/v1/instructor/policies`, GET `/functions/v1/instructor/policies/:id` |
| `instructorApi.ts` | `POST /functions/v1/instructor/ai-booking-suggestions`, `POST /functions/v1/instructor/ai-booking-confirm` |
| `instructorApi.ts` | `PATCH /functions/v1/instructor/availability/:id` (toggle) |
| `instructorApi.ts` | `fetchInstructorBookingAuditLogs()` → GET `/functions/v1/instructor/booking-audit-logs` |
| `instructorApi.ts` | Booking lifecycle → GET `/functions/v1/instructor/booking-lifecycle?bookingId=...` |

From **`apps/instructor/lib/instructorApiServer.ts`** (server components):

| File | Function | URL |
|------|----------|-----|
| `instructorApiServer.ts` | `fetchInstructorBookingAuditLogsServer()` | `getSupabaseFunctionsUrl()/instructor/booking-audit-logs` (Edge) |
| `instructorApiServer.ts` | Booking lifecycle server | Edge `/instructor/booking-lifecycle` |

**Bookings list/detail/create:** After PR5, **no** Edge calls; client and server use **proxy** (`getApiBaseUrl()/instructor/bookings`). Proxy → Fastify has no handler for GET list, GET :id, or POST create → **404**.

### Fastify proxy calls (browser `/api` → `NEXT_PUBLIC_API_URL`)

Proxy: `apps/instructor/app/api/instructor/[...path]/route.ts` → `API_BASE/instructor/{path}`. Session via `getServerSession()` (cookies).

| Client / server | Proxy path | Fastify route |
|----------------|------------|----------------|
| `fetch('/api/instructor/profile')` | GET/PATCH `/instructor/profile` | `profile.ts` ✓ |
| `fetchInstructorDashboardViaApi()` | GET `/instructor/dashboard` | `dashboard.ts` ✓ |
| `getConversations()`, `getMessages()` | GET `/instructor/conversations`, `.../messages` | `conversations.ts` ✓ |
| Services, meeting-points, availability | `/instructor/services`, `/instructor/meeting-points`, `/instructor/availability*` | `services.ts`, `meeting_points.ts`, `availability.ts` ✓ |
| `sendInstructorReply()` | POST `/instructor/inbox/:id/reply` | `reply.ts` ✓ |
| Drafts, calendar, KPIs | `/instructor/drafts/*`, `/instructor/calendar/*`, `/instructor/kpis/*` | `drafts.ts`, `calendar.ts` ✓ |
| **Bookings list/detail/create** | GET `/instructor/bookings`, GET `/instructor/bookings/:id`, POST `/instructor/bookings` | **Not implemented** → 404 |
| Bookings submit/accept/reject/modify/cancel | POST `/instructor/bookings/:id/submit` etc. | `bookings.ts` ✓ |
| GET booking timeline | GET `/instructor/bookings/:id/timeline` | `booking_timeline.ts` ✓ |
| PATCH conversation AI state | PATCH `/instructor/conversations/:id/ai-state` | `conversation_ai_state.ts` ✓ (no UI call yet) |

**Verdict:**  
- **Edge present: YES** – dashboard (legacy path), policies, ai-booking-*, one availability toggle, booking-audit-logs, booking-lifecycle still use Edge.  
- **Profile uses edge: NO** – profile is proxy-only (GET/PATCH `/api/instructor/profile` → Fastify `profile.ts`).

---

## 3) Profile editor alignment audit

### Backend (Fastify) – authoritative shape

- **GET /instructor/profile** (`apps/api/src/routes/instructor/profile.ts`):  
  - `resolveProfile(userId)` → definitive first, else legacy.  
  - **Definitive:** id, user_id, full_name, display_name, slug, profile_status, **timezone**, availability_mode, calendar_sync_enabled, marketing_fields (normalized), operational_fields (normalized), pricing_config, ai_config, compliance, approval_status, created_at, updated_at, base_resort, working_language, contact_email, onboarding_completed_at.  
  - **Legacy:** id, full_name, base_resort, working_language, contact_email, languages, display_name, slug, **timezone**, onboarding_completed_at, marketing_fields, operational_fields. (PR4: timezone included in legacy GET.)

- **PATCH /instructor/profile:**  
  - Tries `patchProfileBodySchema` (definitive); then legacy `validateLegacyPatch`.  
  - **Legacy:** accepts full_name, base_resort, working_language, contact_email, languages, display_name, slug, **timezone**, marketing_fields, operational_fields; persists via `updateInstructorProfileByUserIdExtended`. (PR4: timezone accepted and persisted.)

- **Allowlist:** `ALLOWED_LANGUAGE_CODES` in profile.ts = en, it, fr, de, es, pt, nl, sv, no, da, pl, ru, ar, zh.  
- **marketing_fields.usp_tags:** must be array of strings (validated in legacy path).  
- **operational_fields:** numeric keys validated as number ≥ 0 or absent; same_day_booking_allowed boolean.

### Client (`apps/instructor/lib/instructorApi.ts`)

- `fetchInstructorProfile()`: GET `/api/instructor/profile`; returns `data.profile` as `InstructorProfile`.  
- `updateInstructorProfile(params)`: PATCH `/api/instructor/profile`.  
- **Types:** `InstructorProfile` includes `timezone?: string | null`; `UpdateInstructorProfileParams` includes `timezone`, `marketing_fields`, `operational_fields` (partial). No field dropped.

### ProfileForm (`apps/instructor/components/ProfileForm.tsx`)

- **working_language:** `LANGUAGE_OPTIONS` = same 14 codes as backend → **match**.  
- **USP tags:** `uspTags` (string[]) → `marketing_fields: { ..., usp_tags }` → **marketing_fields.usp_tags**, match.  
- **Operations:** `safeNum()` → number | undefined; payload uses undefined for empty; backend accepts number or null/undefined → **ok**.  
- **Tabs:** Identity PATCHes identity + timezone; Marketing only `{ marketing_fields }`; Operations only `{ operational_fields }` → **correct partial PATCH per tab**.

### Mismatch list and fixes

| # | Mismatch | Severity | Fix (description only) |
|---|----------|----------|------------------------|
| 1 | **Definitive path:** `patchProfileBodySchema` (definitive) does not include base_resort, working_language, contact_email. Profile form sends them in identity tab. If definitive path is used, those fields may be ignored unless definitive schema/repo support them. | Medium | Confirm which path (definitive vs legacy) is used for target instructors; if definitive, add identity scalars to definitive PATCH or keep legacy path for those users. |
| 2 | None remaining for legacy timezone (PR4 done). | — | — |

---

## 4) Booking lifecycle (MVP grade)

- **Persistence:** `packages/db/src/booking_repository.ts`: `createBooking` inserts into `bookings` (instructor_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes). Migrations: `20260208115000_create_bookings.sql`, `20260208120000_booking_schema_reconciliation.sql`, `20260208140000_booking_status_constraint_extend.sql` (status CHECK).
- **Status constraint (DB):** `bookings_status_check`: status IN ('draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined').
- **Status in code:** `packages/db/src/booking_state_machine.ts`: `BookingState = 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'modified' | 'declined'`; transitions align with DB and API (draft→pending, pending→confirmed|declined, etc.). **Aligned** (post-PR1).
- **Link to conversation:** `bookings` table has **no `conversation_id`** column in migrations or `booking_repository.createBooking`. Booking is linked to **instructor_id** and **customer_name**. Instructor app uses `conversation_bookings` in some components (BookingTimeline, BookingOverviewPanel) via Supabase client; that table/view is not in `packages/db` or supabase migrations under audit – linkage is app/Supabase-level only.
- **Instructor API:** Fastify `bookings.ts` registers POST submit/accept/reject/modify/cancel; `booking_timeline.ts` registers GET `:id/timeline`. **GET list, GET :id, POST create are not implemented** in Fastify. `packages/db` has `listInstructorBookings`, `getBookingById`/`getBookingByIdWithExpiryCheck`, `createBooking` but they are not wired to any GET/POST `/instructor/bookings` route. Instructor app (post-PR5) calls proxy for list/detail/create → **404**.

**Output: Booking lifecycle: PARTIAL**

- **Evidence:** Entity persisted; status constrained in DB and code; instructor_id + customer_name present; state machine aligned; **instructor list/detail/create return 404** because Fastify does not expose these endpoints.

---

## 5) Handoff / human control

- **Conversation state:** `packages/db/src/conversation_ai_state_repository.ts`: `ai_state` (ai_on | ai_paused_by_human | ai_suggestion_only); `setConversationAiState` writes DB + `insertAuditEvent` (audit_log).
- **Instructor API:** `apps/api/src/routes/instructor/conversation_ai_state.ts`: PATCH `/instructor/conversations/:id/ai-state` (body: ai_state); ownership via `getInstructorInbox(profile.id)`; onboarding required; calls `setConversationAiState(..., actorType: 'human')`. **Implemented.**
- **Instructor UI:** No call to PATCH `/instructor/conversations/:id/ai-state` found in instructor app (grep: no `ai-state`, `setConversationAiState`, or conversation ai-state in apps/instructor). So **instructor cannot "take over" from the UI**; API exists but is unused.

**Output: Handoff: PARTIAL**

- **Evidence:** API and audit in place; **UI does not expose "Pause AI" / "Take over"** control.

---

## 6) Audit trail and failure handling

- **audit_log:** Table and `insertAuditEvent` used by: conversation_ai_state_repository (instructor ai_state change), conversation_handoff_repository, instructor_policy_document_repository, inbound_draft_orchestrator, webhook_whatsapp, admin routes (approval, send_ai_draft, instructor_whatsapp). **booking_audit** (separate table): `packages/db/src/booking_audit.ts` – `recordBookingAudit` writes to `booking_audit` (booking_id, previous_state, new_state, actor); used by Fastify booking transition routes.
- **Instructor routes:** No `insertAuditEvent` in instructor profile/services/availability/inbox/reply. Booking state changes go to **booking_audit** via `recordBookingAudit` in `bookings.ts`.

**Output: Audit: PARTIAL**

- **Evidence:** audit_log for AI state, handoff, policy, admin; booking_audit for booking transitions; **instructor profile/service/availability/reply not in audit_log**.

- **Errors in UI:** ProfileForm banner (success/error); BookingForm `setError` + `<p>{error}</p>`; InstructorInboxClient 401→redirect, 403/404→message; InstructorDashboardClient and HomeDashboard error state; onboarding/CompleteOnboardingButton inline error.

**Output: Errors visible: YES**

---

## 7) SaaS readiness

- **Feature flags:** `packages/db/src/feature_flag_repository.ts` (getFeatureFlag); admin API uses them. No instructor-facing tier or feature-gate in instructor app or instructor routes.
- **Quotas/limits:** AI quota and rate limiting exist; no per-instructor paid tier or quota in instructor UI/API.

**Output: SaaS readiness: PARTIAL**

---

## 8) Onboarding readiness

- **Flow:** Login (DEFAULT_AFTER_LOGIN = `/instructor/onboarding`) → gate (`gate/page.tsx`) ensures instructor_profiles row → if not approved → approval-pending → if approved and onboarding not completed → onboarding → if completed → gate redirects to dashboard. `(app)/layout.tsx`: session → profile → approved → onboarding completed (else redirect login/gate/approval-pending/onboarding).
- **Time-to-value:** Onboarding form + CompleteOnboardingButton set onboarding_status/profile_status; layout then allows (app) access.
- **Blockers / quick fixes:**  
  - If API returns 403 (e.g. ONBOARDING_REQUIRED), inbox/dashboard show error or block; no redirect loop in code.  
  - Ensure CompleteOnboardingButton success path sets both onboarding_status and profile_status so layout allows access.  
  - Dashboard `getInstructorDashboardData` upcomingBookings query (`instructor_dashboard_repository.ts`) filters only by `start_time >= now` with **no instructor_id** in WHERE – comment says "we query all upcoming bookings" and "would need mapping". **Risk:** upcoming bookings may not be scoped to instructor. Verify and add instructor_id filter if schema allows.

---

## A) PMF readiness scorecard (0–100)

| Category | Score (0–100) | Pass/Fail | Severity | Evidence summary |
|----------|----------------|-----------|----------|-------------------|
| Profile correctness | 85 | Pass | Low | Legacy GET/PATCH include timezone (PR4); types and form aligned; definitive vs legacy path only if definitive used. |
| Services setup | 85 | Pass | Low | API and UI via proxy; DB. |
| Availability setup | 85 | Pass | Low | API and UI via proxy; DB. |
| Inbox reliability | 80 | Pass | Medium | Conversations/messages/reply via proxy; 403 handling; no UI for ai_state. |
| Booking lifecycle | 45 | Fail | High | Persisted; state machine + DB aligned; **list/detail/create 404** (not implemented on Fastify). |
| Human handoff + control | 65 | Fail | Medium | API PATCH ai-state exists; **UI does not call it**. |
| Audit trail | 65 | Fail | Medium | audit_log + booking_audit used; instructor profile/service/reply not in audit_log. |
| Failure handling | 80 | Pass | Low | Errors shown (banners/inline). |
| Monetization readiness | 50 | Fail | Medium | Feature flags exist; no instructor-tier or paid-pilot gating. |

**Overall (average of categories): ~71/100.**  
**Pilot paid readiness: not there yet** – booking list/detail/create must be implemented on Fastify (or revert app to Edge and ensure Edge is deployed); handoff UI and optional audit/monetization fixes.

---

## B) Evidence and pass/fail per category

- **Profile correctness:** Pass – legacy timezone in GET/PATCH (PR4); form and types aligned.  
- **Services setup:** Pass.  
- **Availability setup:** Pass.  
- **Inbox reliability:** Pass – proxy; 403/404 handled.  
- **Booking lifecycle:** Fail – **GET /instructor/bookings, GET /instructor/bookings/:id, POST /instructor/bookings not implemented** on Fastify; app calls proxy → 404.  
- **Human handoff + control:** Fail – instructor ai-state API exists; **no UI control**.  
- **Audit trail:** Fail – instructor profile/service/reply not in audit_log.  
- **Failure handling:** Pass.  
- **Monetization readiness:** Fail – no instructor-facing tier/paid-pilot gating.

---

## C) Minimal fix plan (max 10 items, by leverage)

| # | File(s) | What to change | Acceptance criteria |
|---|--------|----------------|---------------------|
| 1 | `apps/api/src/routes/instructor/bookings.ts` (or new module) | Add **GET /instructor/bookings** (call `listInstructorBookings(instructorId)` from `@frostdesk/db`, return `{ items }`). Auth: JWT → profile.id as instructorId. | Instructor list page loads via proxy. |
| 2 | `apps/api/src/routes/instructor/bookings.ts` | Add **GET /instructor/bookings/:id** (load by id, enforce instructor ownership via profile.id, return single booking or 404). | Instructor detail page loads via proxy. |
| 3 | `apps/api/src/routes/instructor/bookings.ts` | Add **POST /instructor/bookings** (body: customerName, startTime, endTime, serviceId?, meetingPointId?, notes?). Resolve instructorId from JWT/profile; call `createBooking` from `@frostdesk/db`; return `{ id }`). | Instructor can create booking from BookingForm via proxy. |
| 4 | `apps/instructor/components/inbox/HumanInboxPage.tsx` (or conversation detail) | Add "Pause AI" / "Take over" control that calls PATCH `/api/instructor/conversations/:id/ai-state` with `{ ai_state: 'ai_paused_by_human' }` (and optionally "Resume" with `ai_on`). Use existing `getApiBaseUrl()` + auth pattern. | Instructor can pause/resume AI for own conversation from UI. |
| 5 | `packages/db/src/instructor_dashboard_repository.ts` | In upcomingBookings query, add `AND instructor_id = ${instructorId}` if `bookings.instructor_id` type matches (UUID). Fix comment and scope. | Dashboard upcoming bookings scoped to instructor. |
| 6 | (Optional) `apps/api/src/routes/instructor/profile.ts`, `reply.ts` | After successful PATCH profile or key reply, call `insertAuditEvent` with actor_type=instructor, entity_type/entity_id, action. | Key instructor actions in audit_log. |
| 7 | (Optional) Feature flag or allowlist | Gate "paid pilot" (e.g. feature flag or allowlist of instructor ids); return 402 or message when not allowed; optionally show in instructor app. | Can restrict paid features to pilot set. |
| 8 | `apps/instructor/app/instructor/(app)/layout.tsx` and onboarding | Ensure CompleteOnboardingButton success path sets both onboarding_status and profile_status; minimal logging on redirect if needed. | No redirect loop; onboarding completion reliable. |

---

## D) "Pilot paid" definition (what must be true to charge 1 instructor)

1. **Profile:** Instructor can read and update full profile including timezone (done for legacy path).  
2. **Booking:** Instructor can **list**, **view**, and **create** bookings via one path (proxy) that is implemented and tested; confirm/cancel via existing POST routes.  
3. **Handoff:** Instructor can "take over" (pause AI) from the instructor app for at least one conversation (API exists; **UI must call it**).  
4. **Audit:** Critical instructor actions (booking state changes, ai_state change) are recorded (booking_audit + audit_log for ai_state); optional: profile/reply in audit_log.  
5. **Errors:** Failures visible in UI (already true).  
6. **Monetization:** A way to treat one instructor as "paid pilot" (e.g. flag or allowlist) for billing.

---

**End of audit.** Conclusions based only on repo evidence (file paths, code, DB migrations, API contracts). No code was changed; audit and minimal fix plan only.
