# Instructor app — UI route map

Derived from `apps/instructor/app/instructor/**/page.tsx`. Route groups `(app)` and `(pre)` do not appear in the URL.

## UI route map (table)

| URL | File path | Server/Client | Fetch entrypoints |
|-----|-----------|---------------|-------------------|
| `/instructor/login` | `(pre)/login/page.tsx` | client | Supabase auth (getSupabaseBrowser), no instructorApi |
| `/instructor/signup` | `(pre)/signup/page.tsx` | client | Supabase auth only |
| `/instructor/approval-pending` | `(pre)/approval-pending/page.tsx` | — | — |
| `/instructor/gate` | `(pre)/gate/page.tsx` | server | getServerSession, getSupabaseServer, direct DB/Supabase client |
| `/instructor/onboarding` | `(pre)/onboarding/page.tsx` | server | getServerSession, redirect logic |
| `/instructor/onboarding/form` | `(pre)/onboarding/form/page.tsx` | server + client | Server: getServerSession, supabase.from(); Client: InstructorOnboardingForm → saveOnboardingDraft, submitOnboardingComplete (instructorApi) |
| `/instructor/dashboard` | `(app)/dashboard/page.tsx` | server (wrapper) | InstructorDashboardClient (client) → getConversations, getMessages, getKpiSummary (instructorApi) |
| `/instructor/services` | `(app)/services/page.tsx` | client | fetchInstructorServices (instructorApi) |
| `/instructor/meeting-points` | `(app)/meeting-points/page.tsx` | client | fetchInstructorMeetingPoints (instructorApi) |
| `/instructor/availability` | `(app)/availability/page.tsx` | client | fetchAvailability, deactivateAvailability (instructorApi) |
| `/instructor/calendar` | `(app)/calendar/page.tsx` | client | fetchCalendarEvents (instructorApi) |
| `/instructor/profile` | `(app)/profile/page.tsx` | client | fetchInstructorProfile (instructorApi) |
| `/instructor/policies` | `(app)/policies/page.tsx` | client | fetchInstructorPolicies (instructorApi) |
| `/instructor/availability-conflicts` | `(app)/availability-conflicts/page.tsx` | client | fetchAvailabilityConflicts (instructorApi) |
| `/instructor/bookings` | `(app)/bookings/page.tsx` | server | fetchInstructorBookingsServer (instructorApiServer) |
| `/instructor/bookings/new` | `(app)/bookings/new/page.tsx` | — | — |
| `/instructor/bookings/[bookingId]` | `(app)/bookings/[bookingId]/page.tsx` | server | fetchInstructorBookingServer (instructorApiServer) |
| `/instructor/booking-lifecycle` | `(app)/booking-lifecycle/page.tsx` | server | fetchBookingLifecycleByIdServer (instructorApiServer) |
| `/instructor/booking-audit-logs` | `(app)/booking-audit-logs/page.tsx` | server | fetchInstructorBookingAuditLogsServer (instructorApiServer) |
| `/instructor/inbox` | `(app)/inbox/page.tsx` | client (wrapper) | HumanInboxPage (client) → getConversations, getMessages, sendInstructorReply, getConversationDraft, useDraft, ignoreDraft (instructorApi) |
| `/instructor/inbox/[conversationId]` | `(app)/inbox/[conversationId]/page.tsx` | server | fetchInstructorInboxServer (instructorApiServer) — used for initial data |
| `/instructor/ai-booking-preview` | `(app)/ai-booking-preview/page.tsx` | server | fetchAIBookingSuggestionContextServer (instructorApiServer) |
| `/instructor/ai-booking-draft-preview` | `(app)/ai-booking-draft-preview/page.tsx` | client | confirmAIBookingDraft (instructorApi) |
| `/instructor/settings` | `(app)/settings/page.tsx` | — | — |

## Notes

- **Server** = page or component uses async server component / server-side data (e.g. `fetchInstructorBookingsServer()`).
- **Client** = page uses `'use client'` and/or client components that call `instructorApi` in the browser.
- **Fetch entrypoints**: `instructorApi` = browser calls (go through Next proxy `/api/instructor/...`). `instructorApiServer` = server-side only (direct Fastify or Edge; see API route map).
