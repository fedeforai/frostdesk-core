# Loop 1 — Call graph + auth model (evidence only, no fixes)

---

## A) Table: Page → Fetch fn → Endpoint → Runtime → Auth headers → Env vars → Error mapping

| Page | Fetch function | Endpoint (effective) | Runtime | Auth headers | Env vars | Error mapping (page/component) |
|------|----------------|----------------------|---------|--------------|----------|-------------------------------|
| **booking-audit-logs** | `fetchInstructorBookingAuditLogs` | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/booking-audit-logs` | Browser | `Authorization: Bearer ${session.access_token}` (Supabase session) | NEXT_PUBLIC_SUPABASE_URL (required, throw if missing) | Regex: `Failed to fetch\|Load failed\|NetworkError\|audit\|could not be loaded` → "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova." (booking-audit-logs/page.tsx L34–37) |
| **bookings** (list) | `fetchInstructorBookings` (via BookingsSection) | `/api` → Fastify `GET /instructor/bookings` | Browser | None (proxy adds Bearer from cookie) | getApiBaseUrl(): browser `/api`; server NEXT_PUBLIC_API_URL \|\| localhost:3001 | BookingsSection: UNAUTHORIZED → "Sessione scaduta..."; FAILED_TO_LOAD_BOOKINGS\|NOT_FOUND\|ONBOARDING → "Impossibile caricare le prenotazioni..."; else raw. Fallback "Couldn't load bookings" if !(e instanceof Error) (BookingsSection.tsx L20–26) |
| **bookings/[bookingId]** | `fetchInstructorBookingServer` | Server: getApiBaseUrl() + `/instructor/bookings/:id` → Fastify | Server | `Authorization: Bearer ${session.access_token}` (server session) | NEXT_PUBLIC_API_URL \|\| NEXT_PUBLIC_API_BASE_URL \|\| localhost:3001 | UNAUTHORIZED → redirect login; NOT_FOUND → "Booking not found"; else "Couldn't load booking." + Retry link (page L43–45) |
| **booking-lifecycle** | `fetchBookingLifecycleByIdServer` | getSupabaseFunctionsUrl() + `/instructor/booking-lifecycle?bookingId=...` → Supabase Edge | Server | `Authorization: Bearer ${accessToken}` (server session) | NEXT_PUBLIC_SUPABASE_URL (required for getSupabaseFunctionsUrl) | UNAUTHORIZED → redirect; BOOKING_NOT_FOUND → "Prenotazione non trovata"; else "Impossibile caricare il ciclo di vita." (page L124–143) |
| **ai-booking-preview** | `fetchAIBookingSuggestionContext` | `/api` → Fastify `GET /instructor/ai-booking-suggestion-context` | Browser | None (proxy adds Bearer) | getApiBaseUrl(): browser `/api` | Regex: `Failed to fetch\|...\|UPSTREAM_DOWN\|context\|contesto\|...\|servizio sia disponibile` → "L'API non è raggiungibile. Verifica che l'API sia avviata (es. porta 3001) e riprova." (ai-booking-preview/page.tsx L36–39) |
| **ai-booking-draft-preview** | `confirmAIBookingDraft` (on confirm only) | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/ai-booking-confirm` | Browser | `Authorization: Bearer ${session.access_token}` | NEXT_PUBLIC_SUPABASE_URL (required) | No page-level connection-error regex; component/modal handles response (HumanConfirmBookingButton / onConfirm) |
| **policies** | `fetchInstructorPolicyDocument` | `/api` → Fastify `GET /instructor/policies` | Browser | None (proxy) | getApiBaseUrl() | Regex: `Failed to fetch\|...\|polic(y\|ies)\|could not be loaded` → "Connessione non riuscita. Verifica che l'API sia avviata (es. porta 3001) e riprova." (policies/page.tsx L55–58) |
| **meeting-points** | `fetchInstructorMeetingPoints` | `/api` → Fastify `GET /instructor/meeting-points` | Browser | None (proxy) | getApiBaseUrl() | Regex: `...\|meeting point\|meeting points\|...` → same API message (meeting-points/page.tsx L42–45) |
| **availability** | `fetchAvailability` | `/api` → Fastify `GET /instructor/availability` | Browser | None (proxy) | getApiBaseUrl() | Regex: `...\|Unable to load\|failed.*availability\|...\|load availability\|FAILED_TO_LOAD` or (availability + fail/error/load) → same API message (availability/page.tsx L43–47) |
| **customers** | `fetchInstructorCustomers` | `/api` → Fastify `GET /instructor/customers` | Browser | None (proxy) | getApiBaseUrl() | Regex: `Failed to fetch\|...\|failed.*customer\|customer.*failed` → same API message (customers/page.tsx L60–63) |
| **customers/[id]** | `fetchInstructorCustomer` | `/api` → Fastify `GET /instructor/customers/:id` | Browser | None (proxy) | getApiBaseUrl() | (no regex override in snippet; likely raw or generic) |
| **calendar** | `fetchCalendarConnection`, `fetchCalendarEvents` | `/api` → Fastify calendar routes | Browser | None (proxy) | getApiBaseUrl() | "Not authorized" vs "Couldn't load calendar data. Check your connection and retry." (calendar/page.tsx L97) |
| **inbox** (list) | `fetchInstructorInboxServer` | getApiBaseUrl() + `/instructor/inbox` → Fastify | Server | Bearer from server session | NEXT_PUBLIC_API_URL \|\| ... | Throws FAILED_TO_LOAD_INBOX; page shows items or empty |
| **inbox/[conversationId]** | (conversation/messages from client or server) | Various (inbox, conversations, messages) | Server + client | Server: Bearer; client: proxy | Same | — |

---

## B) Auth model diagram (text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BROWSER                                                                     │
│  - Session: Supabase Auth (cookies: sb-*-auth-token)                        │
│  - getSupabaseBrowser() / getSession() → access_token (Supabase JWT)          │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ A) Client calls to /api/instructor/*
         │    - fetch(url) with credentials: 'include' (cookies sent)
         │    - getAuthHeadersForApi() returns {} in browser when base === '/api'
         │    - So no Authorization header sent from browser; proxy adds it
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ NEXT.JS APP ROUTE: /api/instructor/[...path] (apps/instructor/app/api/...)  │
│  - getServerSession() from cookies → session.access_token (Supabase JWT)      │
│  - If !session?.access_token → 401 UNAUTHENTICATED                          │
│  - backendUrl = API_BASE + /instructor/${path}; API_BASE = NEXT_PUBLIC_      │
│    API_URL ?? 'http://localhost:3001'                                        │
│  - fetch(backendUrl, { headers: { Authorization: `Bearer ${session.         │
│    access_token}` } })                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASTIFY (apps/api)                                                           │
│  - Receives Bearer token (Supabase JWT)                                      │
│  - getUserIdFromJwt(request) / instructor resolution from profile           │
│  - No apikey header used                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ BROWSER (direct to Supabase Edge)                                            │
│  - Used by: fetchInstructorBookingAuditLogs, fetchInstructorDashboard       │
│    (legacy?), fetchInstructorPolicies (list), createInstructorPolicy,       │
│    updateInstructorPolicy, confirmAIBookingDraft, deleteInstructorAvailability│
│  - getSupabaseClient() / getSession() → session.access_token                 │
│  - fetch(`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/...`)          │
│  - Headers: Content-Type, Authorization: Bearer ${session.access_token}       │
│  - No apikey / anon key header sent                                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SUPABASE EDGE FUNCTIONS                                                      │
│  - URL: ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/<name>           │
│  - Expect Bearer (Supabase JWT). Some projects require anon key header;      │
│    code does not send it.                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVER COMPONENTS (Next.js)                                                  │
│  - getServerSession() → session.access_token                                 │
│  - instructorApiServer: getApiBaseUrl() for Fastify vs getSupabaseFunctions  │
│    Url() for Edge                                                            │
│  - serverFetch(url, token) with Authorization: Bearer ${accessToken}         │
│  - Fastify: getApiBaseUrl() = NEXT_PUBLIC_API_URL || ... || localhost:3001   │
│  - Edge: getSupabaseFunctionsUrl() = NEXT_PUBLIC_SUPABASE_URL + '/functions/v1'│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## C) Mismatch risks (ranked by likelihood, with evidence)

| Rank | Risk | Evidence (file:line) | Likelihood |
|------|------|----------------------|------------|
| 1 | **Error masking**: Message contains keyword (e.g. "audit") so UI always shows generic "Connessione non riuscita" / "API non raggiungibile" instead of real API message or status. | booking-audit-logs/page.tsx L34–37: regex includes `audit`; instructorApi.ts L2266 fallback is "Impossibile caricare i log di **audit**. Riprova." → every non-2xx triggers generic. | High |
| 2 | **Supabase Edge called from browser without apikey**: Many Supabase projects require `apikey` (anon key) header for Edge; code only sends `Authorization: Bearer`. | instructorApi.ts: all `functions/v1` calls use only `Authorization: Bearer ${session.access_token}`; no `apikey` anywhere (grep: 0 matches in apps/instructor). | Medium–High (if project enforces apikey) |
| 3 | **NEXT_PUBLIC_API_URL not set**: Proxy uses API_BASE = `NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`. In production or custom ports, wrong/missing env → proxy calls wrong host → 502 UPSTREAM_DOWN. | app/api/instructor/[...path]/route.ts L4. Health route uses same (app/api/health/route.ts L7). | Medium |
| 4 | **Booking lifecycle / audit logs depend on Supabase Edge**: If Edge functions are not deployed or wrong project, server/client get 404/502; server throws FAILED_TO_LOAD_*; UI shows generic "Impossibile caricare il ciclo di vita" or "Connessione non riuscita" with no status/code. | instructorApiServer.ts L122–128 (audit logs), L142–148 (lifecycle); booking-lifecycle/page.tsx L124–143; booking-audit-logs uses browser Edge call. | High (deployment/env) |
| 5 | **fetchBookingLifecycleById (client) uses relative URL**: In instructorApi.ts L2294–2297 fetch(`/functions/v1/instructor/booking-lifecycle?bookingId=...`) — in browser this is same-origin relative, so `origin + /functions/v1/...` (e.g. localhost:3000/functions/v1/...) which does not exist. | instructorApi.ts L2294–2297. Booking-lifecycle page does not use this (uses Server); if any client ever called it, would always 404. | Low (currently unused by page) |
| 6 | **Token type consistency**: Proxy and Fastify both receive Supabase JWT. Fastify must validate Supabase JWT (same issuer/secret). If Fastify expects a different JWT shape, 401. | Auth model above; no code change in Loop 1. | Documented only |

---

## D) Exact curl commands (placeholders)

Assume:
- `ORIGIN` = app origin (e.g. https://localhost:3000)
- `API_BASE` = Fastify base (e.g. http://localhost:3001)
- `SUPABASE_URL` = NEXT_PUBLIC_SUPABASE_URL (e.g. https://xxx.supabase.co)
- `BEARER` = valid Supabase access_token (from login / session)

**1) Booking audit logs (browser path — direct to Edge)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER" \
  "$SUPABASE_URL/functions/v1/instructor/booking-audit-logs"
```

**2) Bookings list (via proxy)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Accept: application/json" \
  -H "Cookie: <sb-auth-token-cookie-paste-here>" \
  "$ORIGIN/api/instructor/bookings"
```
(Or with Bearer if client sent it: `-H "Authorization: Bearer $BEARER"`; proxy overwrites with session from cookie.)

**3) Bookings list (direct to Fastify)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $BEARER" \
  "$API_BASE/instructor/bookings"
```

**4) Single booking (server path)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER" \
  "$API_BASE/instructor/bookings/$BOOKING_ID"
```

**5) Booking lifecycle (server path — Edge)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER" \
  "$SUPABASE_URL/functions/v1/instructor/booking-lifecycle?bookingId=$BOOKING_ID"
```

**6) AI booking suggestion context (via proxy)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Accept: application/json" \
  -H "Cookie: <sb-auth-token-cookie>" \
  "$ORIGIN/api/instructor/ai-booking-suggestion-context"
```

**7) AI booking suggestion context (direct Fastify)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $BEARER" \
  "$API_BASE/instructor/ai-booking-suggestion-context"
```

**8) AI booking confirm (browser — Edge)**  
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER" \
  -d '{"confirmed":true,"requestId":"...","startTime":"...","endTime":"...",...}' \
  "$SUPABASE_URL/functions/v1/instructor/ai-booking-confirm"
```

---

## TASK 2 — Inventory of fetch functions (instructorApi.ts and instructorApiServer.ts)

### instructorApi.ts (browser unless noted)

| Function | URL builder | Method | Headers | Credentials | Token source |
|----------|-------------|--------|---------|-------------|--------------|
| fetchInstructorProfile | `/api/instructor/profile` (hardcoded) | GET/PATCH | (proxy adds auth) | include | Cookie via proxy |
| fetchInstructorDashboard | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/dashboard` | GET | Content-Type, Authorization: Bearer session.access_token | — | getSupabaseClient().auth.getSession() |
| fetchInstructorDashboardViaApi | getApiBaseUrl() + `/instructor/dashboard` | GET | (proxy or Bearer from session) | — | getApiBaseUrl(): browser /api → {}; else session |
| fetchInstructorServices | getApiBaseUrl() + `/instructor/services` | GET/POST/PATCH | Content-Type, ...authHeaders (getAuthHeadersForApi) | — | Browser: {} (proxy); server: session |
| fetchAvailabilityConflicts | getApiBaseUrl() + `/instructor/availability/conflicts` | GET | same | same-origin | same |
| fetchInstructorBookings | getApiBaseUrl() + `/instructor/bookings` | GET | Accept, Content-Type, ...authHeaders | include | same |
| fetchInstructorBooking | getApiBaseUrl() + `/instructor/bookings/:id` | GET | same | include | same |
| createInstructorBooking | getApiBaseUrl() + `/instructor/bookings` | POST | same + body | include | same |
| updateInstructorBooking | getApiBaseUrl() + `/instructor/bookings/:id` | PATCH | same | include | same |
| updateInstructorBookingStatus | getApiBaseUrl() + `/instructor/bookings/:id/status` | PATCH | same | include | same |
| deleteInstructorBooking | getApiBaseUrl() + `/instructor/bookings/:id` | DELETE | Accept, ...authHeaders | include | same |
| cancelInstructorBooking | getApiBaseUrl() + `/instructor/bookings/:id/cancel` | POST | same | include | same |
| fetchBookingTimeline | getApiBaseUrl() + `/instructor/bookings/:id/timeline` | GET | Accept, ...authHeaders | include | same |
| fetchInstructorCustomers | getApiBaseUrl() + `/instructor/customers?search&limit&offset` | GET | Accept, ...authHeaders | include | same |
| fetchInstructorCustomer | getApiBaseUrl() + `/instructor/customers/:id` | GET | same | include | same |
| createInstructorCustomerNote / addCustomerNote | getApiBaseUrl() + `/instructor/customers/:id/notes` | POST | same + body | include | same |
| createInstructorCustomer | getApiBaseUrl() + `/instructor/customers` | POST | same | include | same |
| createInstructorMeetingPoint | getApiBaseUrl() + `/instructor/meeting-points` | POST | same | — | same |
| fetchAvailability | getApiBaseUrl() + `/instructor/availability` | GET | same | — | same |
| createAvailability, updateAvailability | getApiBaseUrl() + `/instructor/availability` | POST/PATCH | same | — | same |
| deleteInstructorAvailability | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/availability/${id}` | DELETE | Content-Type, Authorization: Bearer session | — | getSession() |
| deactivateAvailability | getApiBaseUrl() + `/instructor/availability/:id/toggle` | POST | ...authHeaders | — | getAuthHeadersForApi |
| fetchInstructorPolicies | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/policies` | GET | Content-Type, Authorization: Bearer session | — | getSession() |
| fetchInstructorPolicyDocument | getApiBaseUrl() + `/instructor/policies` | GET | ...authHeaders | include | getAuthHeadersForApi |
| patchInstructorPolicyDocumentApi | getApiBaseUrl() + `/instructor/policies` | PATCH | same | — | same |
| createInstructorPolicy | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/policies` | POST | Content-Type, Authorization: Bearer session | — | getSession() |
| updateInstructorPolicy | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/policies/:id` | PATCH | same | — | getSession() |
| fetchCalendarConnection | getApiBaseUrl() + `/instructor/calendar/connection` | GET | same | — | getAuthHeadersForApi |
| fetchCalendarEvents | getApiBaseUrl() + `/instructor/calendar/events?dateFrom&dateTo` | GET | same | include | same |
| connectCalendar, disconnectCalendar, syncCalendar | getApiBaseUrl() + `/instructor/calendar/...` | POST/DELETE/POST | same | — | same |
| fetchAIBookingSuggestionContext | getApiBaseUrl() + `/instructor/ai-booking-suggestion-context` | GET | Accept, ...authHeaders | include | getAuthHeadersForApi |
| confirmAIBookingDraft | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/ai-booking-confirm` | POST | Content-Type, Authorization: Bearer session | — | getSession() |
| fetchInstructorBookingAuditLogs | `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/booking-audit-logs` | GET | Content-Type, Authorization: Bearer session | — | getSession() |
| fetchBookingLifecycleById | `/functions/v1/instructor/booking-lifecycle?bookingId=...` (relative) | GET | Authorization: Bearer session.data.session | — | getSession() — BROKEN in browser (relative URL) |
| getConversations | getApiBaseUrl() + `/instructor/conversations` | GET | ...authHeaders | — | getAuthHeadersForApi |
| getMessages | getApiBaseUrl() + `/instructor/conversations/:id/messages` | GET | same | — | same |
| patchConversationAiState | getApiBaseUrl() + `/instructor/conversations/:id/ai-state` | PATCH | same + body | — | same |
| fetchInstructorInbox | getApiBaseUrl() + `/instructor/inbox` | GET | same | include | same |
| sendInstructorReply | getApiBaseUrl() + `/instructor/inbox/:id/reply` | POST | same + body | — | same |
| getConversationDraft | getApiBaseUrl() + `/instructor/conversations/:id/draft` | GET | same | — | same |
| useDraft, ignoreDraft | getApiBaseUrl() + `/instructor/drafts/:id/use|ignore` | POST | same | — | same |
| getKpiSummary | getApiBaseUrl() + `/instructor/kpis/summary?window=` | GET | same | — | same |

### instructorApiServer.ts (server only)

| Function | URL builder | Method | Headers | Token source |
|----------|-------------|--------|---------|--------------|
| fetchInstructorInboxServer | getApiBaseUrl() + `/instructor/inbox` | GET | Content-Type, Authorization: Bearer token | getServerSession().access_token |
| fetchInstructorBookingsServer | getApiBaseUrl() + `/instructor/bookings` | GET | same | same |
| fetchInstructorBookingServer | getApiBaseUrl() + `/instructor/bookings/:id` | GET | same | same |
| fetchInstructorBookingAuditLogsServer | getSupabaseFunctionsUrl() + `/instructor/booking-audit-logs` | GET | same | same |
| fetchBookingLifecycleByIdServer | getSupabaseFunctionsUrl() + `/instructor/booking-lifecycle?bookingId=` | GET | same | same |
| fetchAIBookingSuggestionContextServer | getSupabaseFunctionsUrl() + `/instructor/ai-booking-suggestions` | GET | same | same |

---

## TASK 3 — Env variable truth table

| Variable | Where used | Fallback / default | If missing / wrong |
|----------|------------|--------------------|--------------------|
| **NEXT_PUBLIC_API_URL** | Proxy route (app/api/instructor/[...path]/route.ts L4), getApiBaseUrl() in instructorApi (server branch), instructorApiServer getApiBaseUrl(), app/api/health/route.ts | Proxy: `?? 'http://localhost:3001'`. instructorApiServer: `NEXT_PUBLIC_API_BASE_URL \|\| NEXT_PUBLIC_API_URL \|\| 'http://localhost:3001'`. instructorApi getApiBaseUrl() (server): same + NEXT_PUBLIC_API_BASE_URL. | Wrong host/port → proxy calls wrong upstream → 502 UPSTREAM_DOWN. Missing: default 3001 used. |
| **NEXT_PUBLIC_SUPABASE_URL** | instructorApi (Edge URLs), instructorApiServer getSupabaseFunctionsUrl(), supabaseBrowser, supabaseServer, middleware | getSupabaseFunctionsUrl(): no fallback, throws 'NO_SUPABASE'. instructorApi: throw 'Missing NEXT_PUBLIC_SUPABASE_URL' for Edge calls. supabaseBrowser/supabaseServer: return null if !url \|\| !key. | Edge calls throw or fail. Supabase client null → auth/session can break. |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | supabaseBrowser (lib/supabaseBrowser.ts), supabaseServer, middleware, LoginForm/SignupForm (missing env message) | No default. supabaseBrowser: if !url \|\| !key return null. | Client/server Supabase null; login/session may not work. |
| **SUPABASE_SERVICE_ROLE_KEY** | Not referenced in apps/instructor (grep). | — | — |
| **NEXT_PUBLIC_API_BASE_URL** | instructorApiServer getApiBaseUrl() only (deprecated alias) | Used before NEXT_PUBLIC_API_URL. | Same as API_URL for server-side Fastify calls. |

---

## TASK 4 — Error handling policy inventory (normalize / regex override / status → copy)

| Location | Pattern (regex or logic) | Override / user copy | Affected pages |
|----------|---------------------------|----------------------|----------------|
| booking-audit-logs/page.tsx L34–37 | `/Failed to fetch|Load failed|NetworkError|audit|could not be loaded/i` | "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova." | Booking audit logs |
| ai-booking-preview/page.tsx L36–39 | `/Failed to fetch|Load failed|NetworkError|UPSTREAM_DOWN|context|contesto|could not be loaded|non è raggiungibile|servizio sia disponibile/i` | "L'API non è raggiungibile. Verifica che l'API sia avviata (es. porta 3001) e riprova." | AI context preview |
| policies/page.tsx L55–58 | `/Failed to fetch|Load failed|NetworkError|polic(y\|ies)|could not be loaded/i` | "Connessione non riuscita. Verifica che l'API sia avviata (es. porta 3001) e riprova." | Policies |
| meeting-points/page.tsx L42–45 | `/Failed to fetch|Load failed|NetworkError|meeting point|meeting points|could not be loaded/i` | Same (API avviata porta 3001) | Meeting points |
| availability/page.tsx L43–47 | `...|Unable to load|failed.*availability|availability.*failed|load availability|FAILED_TO_LOAD` OR `/\bavailability\b/ && /\b(fail|error|load)\b/` | Same (API avviata porta 3001) | Availability |
| customers/page.tsx L60–63 | `UNAUTHORIZED|No session|session not found` → UNAUTHORIZED; `Failed to fetch|...|failed.*customer|customer.*failed` → connection message | Same (API avviata porta 3001) | Customers list |
| BookingsSection.tsx L21–26 | `UNAUTHORIZED|No session` → "UNAUTHORIZED"; `FAILED_TO_LOAD_BOOKINGS|NOT_FOUND|ONBOARDING` → "Impossibile caricare le prenotazioni. Verifica che l'API sia avviata e riprova."; else raw. Fallback raw = 'Couldn\'t load bookings' when !(e instanceof Error) | Bookings list | Bookings (list) |
| calendar/page.tsx L97 | `error === 'Not authorized'` vs else | "Not authorized" vs "Couldn't load calendar data. Check your connection and retry." | Calendar |
| booking-lifecycle/page.tsx L76–84 | message === 'UNAUTHORIZED' → redirect; message === 'BOOKING_NOT_FOUND' → notFound; else loadFailed | "Impossibile caricare il ciclo di vita." (no status/body in UI) | Booking lifecycle |
| bookings/[bookingId]/page.tsx L17–25 | message === 'UNAUTHORIZED' → redirect; message === 'NOT_FOUND' → notFound; else loadFailed | "Couldn't load booking." + Retry link | Booking detail |

InstructorApi.ts (and similar) build error message from:
- `errorData?.message` or `errorData?.error` (string) or
- status-based fallback (502/503 → "Servizio non disponibile..."; 404 → "Endpoint non trovato..."; 500 → "Errore del server..."; else generic).
Those messages are then fed into the page regex above, so any message containing "audit", "context", "polic", etc., is replaced by the generic connection/API message.

---

**End of Loop 1. No fixes proposed; evidence only.**
