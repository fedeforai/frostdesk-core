# Loop 0 — Evidence harvest: Italian error messages and failing endpoints

## 1) Exact source of "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova."

| Field | Value |
|-------|--------|
| **Exact string** | `Connessione non riuscita. Verifica che il servizio sia disponibile e riprova.` |
| **File** | `apps/instructor/app/instructor/(app)/booking-audit-logs/page.tsx` |
| **Line** | 37 |
| **Component** | `BookingAuditLogsPage` (default export) |
| **Function that sets it** | `loadLogs` (catch block) |
| **API call it wraps** | `fetchInstructorBookingAuditLogs()` from `@/lib/instructorApi` |

### Trigger logic (same file, lines 20–37)

- On any thrown error from `fetchInstructorBookingAuditLogs()`:
  - `raw = e?.message ?? 'Impossibile caricare i log di audit'`
  - If `raw` matches regex:  
    `/Failed to fetch|Load failed|NetworkError|audit|could not be loaded/i`
  - Then **setError** is set to the generic string above; otherwise the **raw** message is shown.

So the generic message is shown whenever the error message contains **"audit"** (or one of the other patterns). The API response message from `instructorApi.ts` for non-OK is built at lines 2257–2267 and includes the literal **"audit"** in the fallback:

- `'Impossibile caricare i log di audit. Riprova.'`

So **any** non-2xx from the audit-logs endpoint (404, 500, 502, etc.) produces a message containing "audit" and the UI **always** replaces it with "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova." — i.e. **error masking**.

---

## 2) Request URL and status that trigger it

| Field | Value |
|-------|--------|
| **Endpoint (browser)** | `fetchInstructorBookingAuditLogs()` → **Supabase Edge** (not Fastify proxy) |
| **URL** | `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/booking-audit-logs` |
| **Method** | GET |
| **Headers** | `Content-Type: application/json`, `Authorization: Bearer ${session.access_token}` (Supabase session) |
| **Where** | `apps/instructor/lib/instructorApi.ts` lines 2236–2249 |

So the call goes **from the browser** directly to Supabase Edge. No `apikey` header is sent (only Bearer). Failures that lead to the generic message include:

- **404** – Edge function not deployed or wrong path → fallback message contains "audit" → masked.
- **502/503** – Edge/upstream down → "Servizio non disponibile. Riprova più tardi." → does **not** contain "audit" → **not** masked (user would see that).
- **500** – "Errore del server. Riprova." → no "audit" → not masked.
- **CORS / Failed to fetch** – `raw` = "Failed to fetch" (or similar) → regex matches → masked.

So the **main** case where the user sees "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova." is:

1. **Any 4xx/5xx** whose fallback message is "Impossibile caricare i log di audit. Riprova." (e.g. 404, or any status that uses the generic fallback at line 2266).
2. **Network/CORS** errors where `message` is "Failed to fetch", "Load failed", or "NetworkError".

Root cause for the **audit logs** page: **overly broad error masking** (regex includes "audit") plus **API call going to Supabase Edge from the browser** (no proxy), so Edge missing/wrong env/CORS also contributes.

---

## 3) Related UI strings (same family, different wording)

| UI string | File | Line | API call | When shown |
|-----------|------|------|----------|------------|
| `L'API non è raggiungibile. Verifica che l'API sia avviata (es. porta 3001) e riprova.` | `ai-booking-preview/page.tsx` | 38 | `fetchAIBookingSuggestionContext()` | When `raw` matches regex (e.g. UPSTREAM_DOWN, "context", "contesto", "servizio sia disponibile"). **fetchAIBookingSuggestionContext** now uses **proxy** → Fastify GET `/instructor/ai-booking-suggestion-context`. So 502 from proxy (UPSTREAM_DOWN) triggers this. |
| Same API message (variant) | `policies/page.tsx`, `meeting-points/page.tsx`, `availability/page.tsx`, `customers/page.tsx` | 58, 45, 47, 63 | Various (all via proxy) | When error message matches connection-style regex. |

---

## 4) "Couldn't load bookings"

| Field | Value |
|-------|--------|
| **File** | `apps/instructor/components/bookings/BookingsSection.tsx` |
| **Line** | 20 |
| **Logic** | `const raw = e instanceof Error ? e.message : 'Couldn\'t load bookings';` |
| **When shown** | When the exception is **not** an `Error` instance (e.g. thrown string or other), so the fallback `'Couldn\'t load bookings'` is used. If it **is** an Error, then `raw` is `e.message` and then line 21–25 maps to UNAUTHORIZED or the Italian "Impossibile caricare le prenotazioni..." or leaves `raw`. So the literal "Couldn't load bookings" appears **only** when `e instanceof Error` is false. |
| **API call** | `fetchInstructorBookings()` → **proxy** → Fastify GET `/instructor/bookings` (`apps/instructor/lib/instructorApi.ts` 437–483). |

So "Couldn't load bookings" is the **fallback** when the catch receives a non-Error. If the API returns 500/502, the code throws an `Error` with a proper message, so normally the user would see that message or the Italian mapping, not "Couldn't load bookings" unless something else throws a non-Error.

---

## 5) Booking Lifecycle page ("Ciclo di vita prenotazione")

| Field | Value |
|-------|--------|
| **Page** | `apps/instructor/app/instructor/(app)/booking-lifecycle/page.tsx` |
| **Data fetch** | **Server only**: `fetchBookingLifecycleByIdServer(bookingId)` from `@/lib/instructorApiServer` (line 74). |
| **Endpoint (server)** | `getSupabaseFunctionsUrl()` + `/instructor/booking-lifecycle?bookingId=...` → **Supabase Edge** (instructorApiServer.ts 142–148). |
| **Auth** | `getServerSession()` → `session.access_token` → Bearer in `serverFetch`. |
| **Error shown** | "Impossibile caricare il ciclo di vita." when `loadFailed === true` (any error other than UNAUTHORIZED or BOOKING_NOT_FOUND). Message comes from server throwing e.g. `FAILED_TO_LOAD_BOOKING_LIFECYCLE`. |

There is also a **client** function `fetchBookingLifecycleById` in `instructorApi.ts` (2294–2304) that uses a **relative** URL:

- `/functions/v1/instructor/booking-lifecycle?bookingId=...`
- In the browser this is `origin + path` → e.g. `http://localhost:3000/functions/v1/instructor/booking-lifecycle` → **404** (Next.js has no such route). So if any client code called this, it would always fail. The **page** does not use it (it uses Server); it may be dead or used elsewhere.

---

## 6) AI context preview ("Anteprima contesto prenotazioni")

| Field | Value |
|-------|--------|
| **Page** | `apps/instructor/app/instructor/(app)/ai-booking-preview/page.tsx` |
| **API call** | `fetchAIBookingSuggestionContext()` (browser). |
| **Endpoint** | **Proxy** → Fastify GET `/instructor/ai-booking-suggestion-context` (instructorApi.ts uses getApiBaseUrl() + `/instructor/ai-booking-suggestion-context`). |
| **Trigger for generic message** | When `raw` matches regex (includes UPSTREAM_DOWN, "context", "contesto", "servizio sia disponibile", etc.) → show "L'API non è raggiungibile. Verifica che l'API sia avviata (es. porta 3001) e riprova." So if the proxy returns 502 (UPSTREAM_DOWN) or any message containing "contesto"/"context", the real error is masked. |

---

## 7) Summary table: UI text → page → API call → endpoint

| UI text | Page / component | Fetch function | Endpoint | Who triggers generic message |
|--------|-------------------|----------------|----------|------------------------------|
| Connessione non riuscita. Verifica che **il servizio** sia disponibile e riprova. | booking-audit-logs | `fetchInstructorBookingAuditLogs` | **Supabase Edge** `/functions/v1/instructor/booking-audit-logs` | Any error whose message contains "audit" (e.g. API fallback "Impossibile caricare i log di **audit**") or "Failed to fetch" etc. |
| L'API non è raggiungibile. Verifica che **l'API** sia avviata (es. porta 3001) e riprova. | ai-booking-preview | `fetchAIBookingSuggestionContext` | **Proxy** → Fastify `/instructor/ai-booking-suggestion-context` | 502 UPSTREAM_DOWN or message containing "context"/"contesto"/"servizio sia disponibile" etc. |
| Couldn't load bookings | BookingsSection | `fetchInstructorBookings` | **Proxy** → Fastify `/instructor/bookings` | Only when thrown value is **not** an Error (fallback). |
| Impossibile caricare il ciclo di vita. | booking-lifecycle | `fetchBookingLifecycleByIdServer` | **Supabase Edge** `/instructor/booking-lifecycle` (server) | Any non-OK from Edge (e.g. 404/502/500) other than 401/404 mapped to UNAUTHORIZED / BOOKING_NOT_FOUND. |

---

## 8) Root cause (Loop 0 conclusion)

1. **Booking Audit Logs – "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova."**  
   - **Cause:** Error masking. The regex used to decide “connection error” includes the word **"audit"**, and the API’s own fallback message contains "audit", so **every** failure from the audit-logs API is shown as the generic connection message.  
   - **Request:** Browser → Supabase Edge `GET /functions/v1/instructor/booking-audit-logs` (no proxy).  
   - **Status:** Any non-2xx (404, 500, 502, …) or network error can trigger it; 404 (function not deployed) or CORS/Failed to fetch are the most likely in practice.

2. **AI context preview – generic "L'API non è raggiungibile..."**  
   - **Cause:** Same pattern: broad regex (e.g. "context", "contesto") can mask real API/error messages. Additionally, when the proxy cannot reach Fastify (502 UPSTREAM_DOWN), the message is correct (API not reachable).  
   - **Request:** Browser → `/api/instructor/ai-booking-suggestion-context` → Fastify.

3. **Booking Lifecycle – "Impossibile caricare il ciclo di vita."**  
   - **Cause:** Server calls **Supabase Edge** for lifecycle. If the Edge function is not deployed or returns 502/500, the server throws and the page shows this generic text (no status or backend message in the UI).

4. **"Couldn't load bookings"**  
   - **Cause:** Only when the catch receives a non-Error. Normal API errors are Error with message; so this is a minor/edge case (e.g. if something in the chain throws a string).

---

**Deliverable Loop 0:** This document. Evidence is file/line + endpoint + trigger logic. Do not proceed to fix (Loop 3) until Loop 1–2 confirm and rank root causes.
