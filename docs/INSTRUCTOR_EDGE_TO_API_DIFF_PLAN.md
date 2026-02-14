# Instructor Edge → Fastify API — Diff Plan (PMF-ready)

## Phase A: Audit summary

### Browser calls to Supabase Edge Functions (instructorApi.ts)

| Client function | Edge URL | Data returned | Auth |
|-----------------|----------|---------------|------|
| fetchInstructorProfile | GET /functions/v1/instructor/profile | profile object | Bearer |
| updateInstructorProfile | PUT /functions/v1/instructor/profile | profile | Bearer |
| fetchInstructorDashboard | GET /functions/v1/instructor/dashboard | InstructorDashboardData | Bearer |
| fetchInstructorServices | GET /functions/v1/instructor/services | array | Bearer |
| createInstructorService | POST /functions/v1/instructor/services | service | Bearer |
| updateInstructorService | PATCH /functions/v1/instructor/services/:id | service | Bearer |
| fetchInstructorMeetingPoints | GET /functions/v1/instructor/meeting-points | array | Bearer |
| createInstructorMeetingPoint | POST /functions/v1/instructor/meeting-points | meeting point | Bearer |
| updateInstructorMeetingPoint | PUT /functions/v1/instructor/meeting-points/:id | meeting point | Bearer |
| fetchAvailability | GET /functions/v1/instructor/availability | { items } | Bearer |
| (+ create/update/delete availability, policies, calendar, bookings list/get/create, etc.) | … | … | Bearer |

### Already using API_BASE (no change)

- getConversations, getMessages, sendInstructorReply, getConversationDraft, useDraft, ignoreDraft
- fetchBookingTimeline, fetchConversationTimeline
- fetchInstructorInbox
- saveOnboardingDraft, submitOnboardingComplete
- POST /instructor/bookings/:id/submit | accept | reject | modify | cancel

### Session / auth

- Browser uses getSupabaseBrowser() (cookie-based) and getBrowserAccessToken() for Bearer.
- No createClient(@supabase/supabase-js) localStorage usage in instructorApi (already fixed).
- API uses getUserIdFromJwt(request) and getInstructorProfileByUserId(userId); ownership by profile.id.

### Failing pages (CORS / session)

- Services page → fetchInstructorServices (Edge)
- Meeting points page → fetchInstructorMeetingPoints (Edge)
- Dashboard → fetchInstructorDashboard (Edge)
- Profile → fetchInstructorProfile / updateInstructorProfile (Edge)

---

## Files to change

### 1. packages/db/src/index.ts

- **Why:** Export meeting-points and dashboard repos so Fastify can use them.
- **What:** Add exports for:
  - `listInstructorMeetingPoints`, `createInstructorMeetingPoint`, `updateInstructorMeetingPoint` (+ types) from instructor_meeting_points_repository
  - `getInstructorDashboardData` (+ types) from instructor_dashboard_repository

### 2. apps/api/src/routes/instructor/meeting_points.ts (new)

- **Why:** Provide same-origin API for meeting points; no Edge, no CORS.
- **What:** GET /instructor/meeting-points, POST /instructor/meeting-points, PATCH /instructor/meeting-points/:id. getUserIdFromJwt → profile → listInstructorMeetingPoints(profile.id), create/update with ownership. normalizeError / mapErrorToHttp.

### 3. apps/api/src/routes/instructor/dashboard.ts (new)

- **Why:** Dashboard data today comes from Edge; move to API.
- **What:** GET /instructor/dashboard. getUserIdFromJwt → getInstructorProfileByUserId → getInstructorDashboardData(profile.id). Return same shape as UI (InstructorDashboardData).

### 4. apps/api/src/routes/instructor.ts

- **Why:** Register new routes.
- **What:** Import and register instructorMeetingPointsRoutes, instructorDashboardRoutes.

### 5. apps/instructor/lib/instructorApi.ts

- **Why:** Single source of truth for browser: all data via API_BASE; remove Edge calls for profile, dashboard, services, meeting-points, availability.
- **What:**
  - Add getApiBaseUrl() at top (or keep existing one) and use it for profile, dashboard, services, meeting-points, availability.
  - Replace every `supabaseUrl + /functions/v1/...` fetch with fetch(getApiBaseUrl() + '/instructor/...', { headers: { Authorization: `Bearer ${token}` } }).
  - Unwrap API responses where needed: profile GET → `(await res.json()).profile ?? data`; services GET → `data.services ?? data`; meeting-points GET → `data.meetingPoints ?? data`; dashboard GET → `data` (if API returns full object); availability GET → `data.availability ?? data.items ?? data`.
  - Profile update: use PATCH (API uses PATCH).
  - Meeting-points update: use PATCH (new API uses PATCH).
  - No changes to getSupabaseBrowser / getBrowserAccessToken (already cookie-based).

### 6. apps/instructor/app/instructor/(app)/meeting-points/page.tsx (optional)

- **Why:** Align redirect policy with services/availability (redirect only on 401).
- **What:** Same pattern as services page: if (typeof err?.status === 'number' && err.status === 401) router.push('/login'); else setError(...).

---

## What we are NOT changing

- DB schema, migrations, RLS.
- /instructor/onboarding/complete contract.
- Login, callback, middleware, gate.
- API contracts for existing endpoints (only adding new ones).
- Bookings list/get/create (out of scope for this PMF slice; can be a follow-up).
- Calendar events/connect/disconnect/sync, policies CRUD, availability-conflicts, AI booking, audit logs, booking-lifecycle (out of scope for this slice).

---

## Manual test steps

1. **Local:** Instructor app on :3002, API on :3001. Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in apps/instructor/.env.local (or rely on default).
2. **Start:** `pnpm run dev` from repo root (or run API on 3001, instructor app on 3002).
3. **Login** then open **Services**: no CORS errors in console; Network tab shows request to `localhost:3001/instructor/services` with `Authorization: Bearer <token>`; 200 and page shows list or empty state.
4. **Meeting points**: same; request to `localhost:3001/instructor/meeting-points`; no redirect to login when already logged in.
5. **Dashboard**: request to `localhost:3001/instructor/dashboard`; data or empty state.
6. **API off:** Stop the API; reload Services or Meeting points — no redirect to login; error banner (e.g. "Cannot reach API. Check connection.").
7. **Session expired:** Clear cookies or log out; open Services/Meeting points — should redirect to /login on 401.
