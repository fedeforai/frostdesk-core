# Loop 2 — Root causes confirmed with deterministic repro paths (no fixes)

---

## 1) Ranked root causes (top 5) with confidence % and evidence

| Rank | Cause | Confidence | Evidence (file:line / behavior) |
|------|--------|------------|----------------------------------|
| **1** | **Error masking on booking-audit-logs**: Any non-2xx (or network error) from the audit-logs API produces a message containing the word "audit" (e.g. fallback "Impossibile caricare i log di **audit**. Riprova."). The page treats any message matching `audit|could not be loaded|Failed to fetch|...` as a "connection error" and replaces it with the generic Italian string. So **real** status (404, 500, 502) and **real** body are never shown. | **95%** | instructorApi.ts L2266: fallback string includes "audit". booking-audit-logs/page.tsx L34–37: `isConnectionError = /...|audit|.../i.test(raw)` → setError(generic). |
| **2** | **Booking audit logs call Supabase Edge from browser**: Request goes to `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/booking-audit-logs` with only `Authorization: Bearer ${session.access_token}`. No `apikey` (anon key) header. If the Edge function is not deployed, or URL points to wrong project, or CORS blocks the request, the call fails (404, 502, or network/CORS). CORS applies because origin is the Next app (e.g. localhost:3000) and resource is Supabase (different origin). | **90%** | instructorApi.ts L2236–2249: URL from env, no apikey; fetch from browser. Same pattern for dashboard, policies, confirmAIBookingDraft, deleteInstructorAvailability (all Edge from browser). |
| **3** | **Mixed backend (Fastify vs Edge)**: Bookings list/detail/timeline/cancel use **proxy → Fastify**. Audit logs and lifecycle use **Supabase Edge** (browser direct and server direct). In local/dev: Fastify runs on localhost:3001; Edge runs on hosted Supabase. If Edge functions are not deployed or env points to wrong project, "bookings" (Fastify) works and "audit logs" / "lifecycle" (Edge) fail → "works here, fails there." | **90%** | Loop 1 table: bookings → proxy/Fastify; booking-audit-logs → Edge (browser); booking-lifecycle → Edge (server). instructorApiServer.ts L122–128 (audit), L142–148 (lifecycle) use getSupabaseFunctionsUrl(). |
| **4** | **Booking lifecycle server: empty or invalid token path**: Server gets token via `getServerSession()` (supabaseServer.ts). If cookies are missing, invalid, or `getSupabaseServer()` returns null (missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY), session is null. Then instructorApiServer throws `httpError('UNAUTHORIZED', 401)` before making the request. If session exists but Edge returns 502/500, server throws `httpError('FAILED_TO_LOAD_BOOKING_LIFECYCLE', res.status)`. UI only distinguishes UNAUTHORIZED (redirect), BOOKING_NOT_FOUND (not found copy), and "everything else" → "Impossibile caricare il ciclo di vita." So **status code and response body are never shown** to the user. | **85%** | instructorApiServer.ts L137–141 (token), L147–149 (throw); supabaseServer.ts L52–64 (getServerSession returns null if no supabase or no session). booking-lifecycle/page.tsx L76–84 (message === 'UNAUTHORIZED' | 'BOOKING_NOT_FOUND' | else loadFailed); L124–143 (loadFailed → generic message only). |
| **5** | **"Couldn't load bookings" edge case**: BookingsSection uses `raw = e instanceof Error ? e.message : 'Couldn\'t load bookings'`. So the literal "Couldn't load bookings" is shown **only** when the caught value is **not** an `Error` instance. In instructorApi.ts, fetchInstructorBookings always throws `new Error(...)` (or err with err = new Error(msg)). So under normal code paths, every throw is an Error. Non-Error could only occur if (a) a dependency or middleware throws a string/object, or (b) a rejected promise with a non-Error value is not wrapped. No `throw 'string'` or `throw { message }` found in instructor app for this path. So this is a **defensive fallback** that rarely triggers; when it does, it hides the real value. | **70%** | BookingsSection.tsx L20. instructorApi.ts: all throw sites in fetchInstructorBookings path are `throw err` or `throw new Error(...)` (L442–480). Grep for `throw ['\"]` in apps/instructor: no matches. |

---

## 2) Exact failing request signature per cause

| Cause | URL | Method | Headers | Token source |
|-------|-----|--------|---------|---------------|
| **1 & 2 (audit logs)** | `GET ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instructor/booking-audit-logs` | GET | `Content-Type: application/json`, `Authorization: Bearer ${session.access_token}`. **No** `apikey` / `x-api-key` header. | Browser: getSupabaseClient().auth.getSession() → session.access_token (instructorApi.ts L2228–2249). |
| **3 (lifecycle server)** | `GET ${getSupabaseFunctionsUrl()}/instructor/booking-lifecycle?bookingId=${bookingId}` where getSupabaseFunctionsUrl() = `NEXT_PUBLIC_SUPABASE_URL` + `/functions/v1` | GET | `Content-Type: application/json`, `Authorization: Bearer ${accessToken}`. **No** apikey. | Server: getServerSession() (cookies) → session.access_token (instructorApiServer.ts L136–146). |
| **3 (proxy/Fastify bookings)** | `GET ${API_BASE}/instructor/bookings` with API_BASE = `NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'` (from Next server when proxying). Browser calls `GET /api/instructor/bookings` with cookies; proxy forwards to above with Bearer from session. | GET | From browser: credentials include (cookies). From proxy: `Accept: application/json`, `Authorization: Bearer ${session.access_token}`. | Proxy: getServerSession() from cookies; Fastify validates same Supabase JWT. |
| **4 (empty token)** | Same as lifecycle server; request may never be sent if token is missing. | GET | — | getServerSession() returns null → instructorApiServer L119–122: !session?.user?.id → httpError('UNAUTHORIZED', 401); !token → httpError('UNAUTHORIZED', 401). |
| **5** | Same as proxy/Fastify bookings (fetchInstructorBookings). No distinct "failing" signature; the fallback triggers only when the thrown value is not an Error. | GET | Same | Same |

---

## 3) What status/body would occur and why

| Scenario | Status | Body / response | Why |
|----------|--------|------------------|-----|
| **Audit logs: Edge function not deployed or wrong path** | 404 | Often HTML (Supabase 404 page) or JSON error from gateway. | No handler at `/functions/v1/instructor/booking-audit-logs` for that project. |
| **Audit logs: CORS (browser)** | (no status; fetch fails) | — | Browser blocks; `fetch()` rejects (e.g. TypeError / "Failed to fetch"). Message typically "Failed to fetch" → matches page regex → masked as "Connessione non riuscita...". |
| **Audit logs: Edge returns 500/502** | 500 or 502 | May be JSON `{ message, error }` or empty. instructorApi uses fallback "Servizio non disponibile..." or "Impossibile caricare i log di audit. Riprova." (L2262–2266). | Backend or Edge failure. Message "audit" in fallback → page regex → masked. |
| **Audit logs: Missing/invalid JWT** | 401 | Often JSON from Supabase (e.g. invalid token). | instructorApi maps 401 → throw new Error('UNAUTHORIZED'); page maps UNAUTHORIZED → "Sessione scaduta...". Not masked. |
| **Lifecycle server: No session (cookies missing/invalid)** | (no HTTP; throw before request) | — | getServerSession() returns null → httpError('UNAUTHORIZED', 401). Page redirects to login. |
| **Lifecycle server: Edge 502/500** | 502 or 500 | Gateway or function body (often JSON or empty). | instructorApiServer throws httpError('FAILED_TO_LOAD_BOOKING_LIFECYCLE', res.status). UI shows only "Impossibile caricare il ciclo di vita." — **status and body hidden**. |
| **Lifecycle server: Edge 404** | 404 | — | httpError('BOOKING_NOT_FOUND', 404). Page shows "Prenotazione non trovata." Not masked. |
| **Bookings list: Proxy cannot reach Fastify** | 502 | `{ ok: false, error: 'UPSTREAM_DOWN' }` from Next proxy. | Proxy catch (route.ts): fetch(backendUrl) throws → 502 UPSTREAM_DOWN. instructorApi builds msg from errorData; BookingsSection maps FAILED_TO_LOAD_BOOKINGS etc. to Italian copy; else shows raw. So user may see "Servizio non disponibile..." or raw "UPSTREAM_DOWN" depending on message. |
| **Bookings list: Non-Error thrown** | N/A | N/A | If something throws a string or object, catch gets non-Error → raw = 'Couldn\'t load bookings' → user sees "Couldn't load bookings." |

---

## 4) Where it becomes masked in UI and what users see

| Cause | File:line (masking logic) | What user sees instead of real error |
|-------|---------------------------|--------------------------------------|
| **1 (audit masking)** | booking-audit-logs/page.tsx L34–37 | "Connessione non riuscita. Verifica che il servizio sia disponibile e riprova." for **any** failure (404, 500, 502, network, CORS). |
| **2 (Edge from browser)** | Same as above; failure mode (404/CORS/502) still ends up with message containing "audit" or "Failed to fetch" → same generic message. | Same. |
| **3 (mixed backend)** | No single "masking" line; user sees success on bookings (Fastify) and generic failure on audit/lifecycle (Edge) with no indication that two different backends are used. | "Connessione non riuscita..." (audit) or "Impossibile caricare il ciclo di vita." (lifecycle) with no status or backend hint. |
| **4 (lifecycle status hidden)** | booking-lifecycle/page.tsx L76–84, L124–143 | For any error other than UNAUTHORIZED or BOOKING_NOT_FOUND, user sees only "Impossibile caricare il ciclo di vita." + Retry link. No HTTP status, no error message from response body. |
| **5 (Couldn't load bookings)** | BookingsSection.tsx L20 | If non-Error is thrown, user sees "Couldn't load bookings" and the real thrown value is never shown. |

---

## 5) Minimal acceptance criteria for a fix (not the fix itself)

| Cause | Acceptance criteria (what "fixed" means) |
|-------|------------------------------------------|
| **1** | For booking-audit-logs page: user sees either the **API response message** (errorData.message or errorData.error) or a **status-aware** message (e.g. 404 vs 502 vs network), and the generic "Connessione non riuscita..." is not shown for every failure. Optionally: remove or narrow the regex so that the word "audit" in the API message does not force the generic copy. |
| **2** | Either (a) audit-logs call goes through the same-origin proxy (and Fastify implements the endpoint) so CORS and single-backend behavior apply, or (b) Edge invocation is documented/verified (apikey if required, CORS allowed for app origin), and failures still surface real status/message in the UI (see 1). |
| **3** | Documentation or runtime hint so that "works here, fails there" is explainable (e.g. which routes use Edge vs Fastify). And/or unify so that audit/lifecycle use the same backend as bookings where feasible. |
| **4** | Booking lifecycle page shows a **deterministic** message for server/Edge failures: e.g. include status code or a short backend message (from response body or thrown message), not only "Impossibile caricare il ciclo di vita." for all non-401/404. |
| **5** | Either (a) ensure fetchInstructorBookings (and any caller) never throws a non-Error, or (b) BookingsSection treats non-Error by showing a safe string representation (e.g. String(e)) or a single generic message, and logs or reports the real value for debugging. Acceptance: user never sees "Couldn't load bookings" when a more specific message (e.g. from API) is available. |

---

## TASK 1 — Booking audit logs Edge function

**Does the Edge call require apikey in addition to Authorization?**  
- **Repo:** No caller in the repo sends an `apikey` or `x-api-key` header for Edge. All use only `Authorization: Bearer ${session.access_token}` (instructorApi.ts L2246–2248 and equivalent for other Edge calls).  
- **Supabase docs:** Edge invocation expects an **Authorization** header; the Bearer token can be the project anon/publishable key or a **user JWT**. So sending the user's `access_token` (Supabase JWT) in Bearer is valid. A separate `apikey` header is not documented as required for authenticated user calls; it is a **possible** project-specific requirement (e.g. for CORS or extra verification).  
- **Conclusion:** Code does **not** send apikey. If the project or gateway requires it, 401/403 could occur; otherwise Bearer user JWT is sufficient.

**Browser and CORS:**  
- The call is executed **in the browser** (instructorApi.ts fetchInstructorBookingAuditLogs is used by booking-audit-logs/page.tsx, a client component).  
- CORS **applies**: origin = Next app (e.g. `http://localhost:3000`), resource = Supabase (e.g. `https://xxx.supabase.co`). If the Edge response does not include `Access-Control-Allow-Origin` for that origin, the browser will block and `fetch()` will reject (e.g. "Failed to fetch") → caught and masked by the page regex.

**Failure modes:**

| Mode | Result |
|------|--------|
| **Missing apikey** | Only if the project requires it; then 401/403 possible. Repo never sends it. |
| **Missing/expired access_token** | getSession() returns null → code throws UNAUTHORIZED before fetch; or Edge returns 401 → instructorApi throws UNAUTHORIZED; page shows "Sessione scaduta...". Not masked. |
| **Wrong SUPABASE_URL (e.g. prod while local runs)** | Request goes to wrong project; if path exists there, wrong data or 403; if not, 404. Response message may still contain "audit" (fallback) → masked. |
| **Edge function not deployed or path mismatch** | 404 (or gateway error). instructorApi fallback "Endpoint non trovato." or "Impossibile caricare i log di audit. Riprova." (L2263–2266) → "audit" in string → page regex → "Connessione non riuscita...". |

---

## TASK 2 — Booking lifecycle Edge function (server-side)

**How server gets the token:**  
- `getServerSession()` (supabaseServer.ts L53–64).  
- Implementation: `getSupabaseServer()` (needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY); then `supabase.auth.getSession()`. Session is read from **cookies** (createServerClient with cookie adapter).  
- Return type: `AuthSession = { user, access_token? } | null`.  
- instructorApiServer (L136–141): `const session = await getServerSession(); if (!session?.user?.id) httpError('UNAUTHORIZED', 401); const token = session.access_token; if (!token) httpError('UNAUTHORIZED', 401);`.

**Code path leading to empty token:**  
- `getSupabaseServer()` returns **null** if !url \|\| !key (supabaseServer.ts L9–11). Then `getSession()` is never called; callers use the client from a different code path or getSession is called on null. Actually getServerSession() calls `const supabase = await getSupabaseServer(); if (!supabase) return null;` — so if env is missing, session is null.  
- If supabase exists but cookies are missing/expired/invalid, `getSession()` may return `{ data: { session: null } }` or throw (e.g. refresh_token_not_found); on throw, supabaseServer catches and returns `{ data: { session: null } }` (L58–61). So `result?.data?.session ?? null` is null → **session is null** → no token.  
- So: **missing env** (NEXT_PUBLIC_SUPABASE_URL or ANON_KEY) → session null; **stale/invalid cookies** (e.g. refresh_token_not_found) → session null. In both cases instructorApiServer throws UNAUTHORIZED before making the request.

**Exact message shown in UI and whether it hides status:**  
- For **UNAUTHORIZED**: redirect to /instructor/login (booking-lifecycle/page.tsx L77–78).  
- For **BOOKING_NOT_FOUND**: "Prenotazione non trovata." (L80–81, L87–114).  
- For **any other** error (e.g. FAILED_TO_LOAD_BOOKING_LIFECYCLE with status 502/500): **loadFailed = true** (L83–84). Rendered at L124–143: "Impossibile caricare il ciclo di vita." + Retry link. **Status code and response body are not shown**; the user cannot see 502 vs 500 vs network. So status is **hidden** for all non-401/404 failures.

---

## TASK 3 — Proxy vs Edge inconsistencies (mixed backend risk)

**Summary:**  
- **Bookings** (list, detail, timeline, cancel, create, update, etc.): browser → **Next proxy** (`/api/instructor/...`) → **Fastify** (NEXT_PUBLIC_API_URL, default localhost:3001). Same-origin, no CORS; token from cookie in proxy.  
- **Audit logs**: **browser** → **Supabase Edge** (NEXT_PUBLIC_SUPABASE_URL/functions/v1/...). Cross-origin; token from getSession() in browser.  
- **Lifecycle**: **server** → **Supabase Edge** (same URL pattern). Server-side fetch; token from getServerSession() (cookies).

**"Works here, fails there" in local/dev:**  
- **Works:** Bookings list/detail (Fastify). If the API is running on 3001 and proxy is configured, requests succeed.  
- **Fails:** Audit logs (Edge from browser): if Edge is not deployed for the project, or CORS does not allow the app origin, or SUPABASE_URL points to wrong project → 404 or CORS or 502. Lifecycle (Edge from server): same URL/env; if Edge is down or not deployed, server gets 502/404 and throws; user sees "Impossibile caricare il ciclo di vita."  
- So in a **local** setup where Fastify is up but Edge functions are **not** deployed (or wrong project): bookings work, audit logs and lifecycle fail. No single "service down" that explains both; the UI does not distinguish "API (Fastify) unreachable" vs "Edge (Supabase) unreachable."

**Risk assessment:**  
- **Operational:** Two backends to deploy and configure (Fastify + Supabase Edge). Env must be correct for both (NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SUPABASE_URL).  
- **User experience:** Generic messages ("Connessione non riuscita", "Impossibile caricare il ciclo di vita") do not indicate which backend failed.  
- **Auth:** Both use the same Supabase JWT (Bearer). Fastify must accept that JWT; Edge accepts it by default. No apikey sent to Edge.

---

## TASK 4 — Bookings "Couldn't load bookings" edge case

**Throw sites that throw non-Error:**  
- **Grep** in apps/instructor for `throw '` or `throw "`: **no matches**.  
- instructorApi.ts: all throws in the fetchInstructorBookings path are `throw err` or `throw new Error(...)` where `err` is always `new Error(msg)` or similar. So **no intentional throw of string or plain object** in that path.

**Callers that use `instanceof Error` and fall back to generic copy:**  
- **BookingsSection.tsx L19–26:**  
  - `const raw = e instanceof Error ? e.message : 'Couldn\'t load bookings';`  
  - So if `e` is **not** an Error, `raw` is the literal `'Couldn\'t load bookings'`. Then `msg` is that string (no regex maps it to UNAUTHORIZED or the Italian copy), and `setLoadError(msg)` → user sees "Couldn't load bookings."

**Exact code paths that could lead to non-Error in catch:**  
1. **Rejected promise with non-Error value:** e.g. `Promise.reject('something')` or `Promise.reject({ code: 'X' })` from a dependency. instructorApi does not do that; fetchInstructorBookings only throws Error. So this would require a bug or a different caller.  
2. **Synchronous throw of non-Error:** No such throw found in the instructor app for this flow.  
3. **Theoretical:** If `fetchInstructorBookings` were ever to do `throw response` or `throw errorData` (it does not), then `e instanceof Error` would be false.  
- **Conclusion:** The fallback is **defensive**. Under current code, the only way to see "Couldn't load bookings" from BookingsSection is (a) a non-Error thrown from fetchInstructorBookings or its callees (not present in code today), or (b) a dependency/middleware throwing a non-Error. So the **exact code path** for "Couldn't load bookings" is: **catch (e)** where **e is not an instance of Error** (e.g. string or object). No such path is implemented in the repo; the fallback exists for robustness.

---

**End of Loop 2. No fixes implemented; root causes and repro signatures only.**
