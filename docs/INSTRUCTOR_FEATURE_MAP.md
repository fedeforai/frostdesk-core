# Instructor app — Feature map

Single source of truth: feature → pages → API calls → backend. Derived from UI route map and API route map.

---

## Feature map (table)

| Feature | Pages (URLs) | API calls (entrypoints) | Backend |
|---------|--------------|-------------------------|---------|
| **Auth (pre)** | `/instructor/login`, `/instructor/signup`, `/instructor/approval-pending` | Supabase auth only (no instructorApi) | Supabase Auth |
| **Gate / onboarding** | `/instructor/gate`, `/instructor/onboarding`, `/instructor/onboarding/form` | getServerSession, Supabase client; form: saveOnboardingDraft, submitOnboardingComplete | Gate: direct Supabase; onboarding complete/draft: Fastify (via instructorApi proxy) |
| **Dashboard** | `/instructor/dashboard` | getConversations, getMessages, getKpiSummary | Fastify (via Next proxy) |
| **Services** | `/instructor/services` | fetchInstructorServices | Fastify |
| **Meeting points** | `/instructor/meeting-points` | fetchInstructorMeetingPoints | Fastify |
| **Availability** | `/instructor/availability`, `/instructor/availability-conflicts` | fetchAvailability, deactivateAvailability, fetchAvailabilityConflicts | Fastify |
| **Calendar** | `/instructor/calendar` | fetchCalendarEvents | Fastify |
| **Profile** | `/instructor/profile` | fetchInstructorProfile | Fastify |
| **Policies** | `/instructor/policies` | fetchInstructorPolicies | Fastify |
| **Bookings (list)** | `/instructor/bookings` | fetchInstructorBookingsServer | **Edge** (instructorApiServer) |
| **Bookings (single)** | `/instructor/bookings/[bookingId]` | fetchInstructorBookingServer | **Edge** |
| **Booking lifecycle** | `/instructor/booking-lifecycle` | fetchBookingLifecycleByIdServer | **Edge** |
| **Booking audit logs** | `/instructor/booking-audit-logs` | fetchInstructorBookingAuditLogsServer | **Edge** |
| **Inbox (list + thread)** | `/instructor/inbox`, `/instructor/inbox/[conversationId]` | getConversations, getMessages, sendInstructorReply, getConversationDraft, useDraft, ignoreDraft (instructorApi); fetchInstructorInboxServer (instructorApiServer) | Fastify (proxy + server inbox) |
| **AI booking preview** | `/instructor/ai-booking-preview` | fetchAIBookingSuggestionContextServer | **Edge** |
| **AI booking draft** | `/instructor/ai-booking-draft-preview` | confirmAIBookingDraft | Fastify (via proxy) |
| **Settings** | `/instructor/settings` | — | — |

---

## Issues list

1. **Inconsistent backend for bookings and AI booking**  
   - Bookings list, single booking, audit logs, lifecycle, and AI booking suggestion context are loaded **server-side** via `instructorApiServer` and call **Supabase Edge Functions** (`getSupabaseFunctionsUrl()`), not Fastify.  
   - Rest of instructor features use **Fastify** (either via Next proxy from client or from server for inbox).

2. **Mixed session sources**  
   - All authenticated calls use the same session conceptually (NextAuth / getServerSession), but:  
     - **Browser**: no token; Next proxy adds Bearer from `getServerSession()`.  
     - **Server**: `instructorApiServer` uses `getServerSession()` and sends Bearer to either Fastify or Edge.  
   - No inconsistency in session source (always server-side session), but two different backends (Fastify vs Edge) receive that token.

3. **No direct :3001 from browser**  
   - Client `instructorApi` uses same-origin `/api` only; tripwire blocks `localhost:3001` and Supabase Edge URLs. No issue here.

4. **Edge calls only from server**  
   - Direct Edge usage is confined to `instructorApiServer` (bookings, booking, audit-logs, lifecycle, ai-booking-suggestions). No Edge calls from client.

5. **Single Fastify path for inbox**  
   - Inbox is the only server-side data fetch that goes to Fastify (`fetchInstructorInboxServer` → Fastify `/instructor/inbox`). All other server-side data fetches in instructorApiServer that we mapped go to Edge.

---

## Proposed single rule and migration plan

**Single rule (proposed)**  
- All instructor data and actions go through the **Next proxy** and then **Fastify**. No direct calls from the app (client or server) to Supabase Edge for instructor features.

**Migration plan (proposed, no refactors in this audit)**  
1. **Backend**: Add or align Fastify routes for: bookings list, single booking, booking audit logs, booking lifecycle, AI booking suggestion context (so they mirror or replace current Edge behavior).  
2. **instructorApiServer**: Replace Edge calls with either:  
   - Same-path fetch to Fastify via `getApiBaseUrl()` and Bearer from `getServerSession()`, or  
   - Server-side call to Next proxy (same-origin) then Fastify, so all auth and routing stays behind one gateway.  
3. **Deprecate**: Instructor Edge endpoints for the above once Fastify and instructor app are migrated.  
4. **Session**: Keep single source of truth for auth (getServerSession); no change to session source, only to backend target (Fastify only).

This document is read-only; no code or migrations were changed.
