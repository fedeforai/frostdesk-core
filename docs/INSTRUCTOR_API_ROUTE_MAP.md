# Instructor app — API route map

Derived from `apps/instructor/app/api/**/route.ts`, `apps/instructor/lib/instructorApi.ts`, `apps/instructor/lib/instructorApiServer.ts`, and `apps/api/src/routes/instructor/**`.

---

## 1. Next.js proxy (Route Handler)

| Proxy path | File | Auth | Forwards to |
|------------|------|------|-------------|
| `/api/instructor/*` | `app/api/instructor/[...path]/route.ts` | `getServerSession()` (cookies) → `Authorization: Bearer <token>` | Fastify at `API_BASE` (env), same path under Fastify (e.g. `/instructor/services`) |

- **Method**: Forwards request method and body; returns status and body as-is from Fastify.
- **Client usage**: `instructorApi.apiFetch(path)` builds URL as `/api` + path (e.g. path `/instructor/services` → `/api/instructor/services`). No token sent from browser; proxy adds Bearer token server-side.

---

## 2. Fastify backend routes (instructor scope)

Registered under `/instructor` prefix in `apps/api/src/routes/instructor.ts`. Auth: JWT Bearer (from Next proxy or server-side caller).

| Method | Path (under /instructor) | Handler / file | Response shape (brief) |
|--------|--------------------------|----------------|------------------------|
| GET | `/profile` | profile | Instructor profile object |
| PATCH | `/profile` | profile | Updated profile |
| GET | `/dashboard` | dashboard | Dashboard payload |
| GET | `/meeting-points` | meeting-points | List of meeting points |
| POST | `/meeting-points` | meeting-points | Created meeting point |
| PATCH | `/meeting-points/:id` | meeting-points | Updated meeting point |
| GET | `/availability` | availability | Availability slots |
| POST | `/availability` | availability | Created availability |
| PATCH | `/availability/:id/toggle` | availability | Toggled slot |
| GET | `/services` | services | List of services |
| POST | `/services` | services | Created service |
| PATCH | `/services/:id` | services | Updated service |
| GET | `/guardrails` | guardrails | Guardrails config |
| PATCH | `/guardrails` | guardrails | Updated guardrails |
| GET | `/whatsapp` | whatsapp | WhatsApp connection status |
| POST | `/whatsapp/connect` | whatsapp | Connect flow |
| GET | `/inbox` | inbox | Inbox/conversations list |
| GET | `/conversations` | conversations | Conversations list |
| GET | `/conversations/:id/messages` | conversations | Messages for conversation |
| GET | `/conversations/:id/draft` | drafts | Draft for conversation |
| POST | `/drafts/:id/use` | drafts | Use draft |
| POST | `/drafts/:id/ignore` | drafts | Ignore draft |
| GET | `/kpis/summary` | drafts | KPIs summary |
| POST | `/inbox/:id/reply` | reply | Send reply |
| POST | `/bookings/:id/submit` | bookings | Submit booking |
| POST | `/bookings/:id/accept` | bookings | Accept |
| POST | `/bookings/:id/reject` | bookings | Reject |
| POST | `/bookings/:id/modify` | bookings | Modify |
| POST | `/bookings/:id/cancel` | bookings | Cancel |
| GET | `/calendar/conflicts` | calendar | Calendar conflicts |
| GET | `/referrals` | conversations_handoff | Referrals list |
| POST | `/conversations/:id/handoff` | conversations_handoff | Handoff result |
| GET | `/conversations/:id/timeline` | conversation_timeline | Conversation timeline |
| GET | `/bookings/:id/timeline` | booking_timeline | Booking timeline |
| POST | `/onboarding/draft` | onboarding | Save onboarding draft |
| POST | `/onboarding/complete` | onboarding | Complete onboarding |

---

## 3. Server-side calls that bypass Next proxy

Used by `instructorApiServer.ts` only (Server Components / server code).

| Function | Target | Base URL | Auth |
|----------|--------|----------|------|
| `fetchInstructorInboxServer` | Fastify `GET /instructor/inbox` | `getApiBaseUrl()` | Bearer from `getServerSession()` |
| `fetchInstructorBookingsServer` | **Edge** `GET /functions/v1/instructor/bookings` | `getSupabaseFunctionsUrl()` | Bearer from `getServerSession()` |
| `fetchInstructorBookingServer` | **Edge** `GET /functions/v1/instructor/bookings/:id` | `getSupabaseFunctionsUrl()` | Bearer from `getServerSession()` |
| `fetchInstructorBookingAuditLogsServer` | **Edge** (audit logs) | `getSupabaseFunctionsUrl()` | Bearer from `getServerSession()` |
| `fetchBookingLifecycleByIdServer` | **Edge** (lifecycle) | `getSupabaseFunctionsUrl()` | Bearer from `getServerSession()` |
| `fetchAIBookingSuggestionContextServer` | **Edge** (ai-booking context) | `getSupabaseFunctionsUrl()` | Bearer from `getServerSession()` |

So: **inbox** goes to Fastify; **bookings list, single booking, audit logs, lifecycle, AI booking context** go to Supabase Edge Functions (not Fastify).

---

## 4. Client-only API (instructorApi) — all via Next proxy

All `instructorApi` functions use `apiFetch(path)` → `/api` + path → Next proxy → Fastify. No direct `localhost:3001` or Edge URLs from the browser (tripwire blocks those). No token in browser; proxy adds it.

Examples: `fetchInstructorProfile`, `fetchInstructorServices`, `fetchAvailability`, `fetchInstructorMeetingPoints`, `fetchCalendarEvents`, `fetchInstructorPolicies`, `fetchAvailabilityConflicts`, `getConversations`, `getMessages`, `sendInstructorReply`, `getConversationDraft`, `useDraft`, `ignoreDraft`, `getKpiSummary`, `saveOnboardingDraft`, `submitOnboardingComplete`, `confirmAIBookingDraft`, booking actions (submit/accept/reject/modify/cancel), etc.
