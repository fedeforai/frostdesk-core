# Instructor app: Auth + routing audit

**Scope:** Next.js 14 (App Router) instructor app, Supabase SSR auth, API proxy.  
**Ports:** Next 3012 (or 3002), API 3001.  
**Cookie:** `sb-fggheegqtghedvibisma-auth-token`.

---

## 1) Executive Summary

- **Root cause of “No session found” in Inbox/Bookings:** Client-side `instructorApi.ts` used `createClient()` (browser), which reads from **localStorage**. Auth is stored in an **httpOnly cookie** set by Supabase. So `getSession()` in the browser always returned `null` → code threw “No session found” before any request. The proxy at `/api/instructor/[...path]` never got a chance to attach the cookie.
- **Root cause of sidebar sending users to /instructor/login:** The same client API calls threw “No session found”;
  - catch blocks (e.g. in `InstructorInboxClient`, calendar/policies/services pages) called `router.replace('/instructor/login')` or `router.push('/instructor/login')`.
- **Fix applied:** For **browser** requests that use the **proxy** (`getApiBaseUrl() === '/api'`), client code no longer calls `getSession()` or sends `Authorization`. A new helper `getAuthHeadersForApi()` returns `{}` in that case so the proxy adds the Bearer token from the cookie. Server-side and non-proxy calls still use session and send the header.
- **Connectivity:** API base URL default unified to `http://localhost:3001` (was `127.0.0.1` in one place) to avoid IPv6/consistency issues. `/api/health` already proxies to the API and returns 200 when the API is up.
- **Instrumentation:** Middleware and proxy route now log a single-line auth trace (pathname, hasCookie, cookieLen, hasSession; proxy adds tokenPresent, tokenLen, upstreamStatus) when `AUTH_TRACE=1` or `NODE_ENV !== 'production'`. No cookie or token values are logged.

---

## 2) Findings Table

| Issue | Evidence (file:line) | Fix |
|-------|----------------------|-----|
| Client getSession() null in browser for proxy-backed calls | `lib/instructorApi.ts`: getConversations, getMessages, fetchInstructorInbox, etc. use `getSupabaseClient()` + `getSession()`; browser client uses default storage (localStorage), cookie is httpOnly | Use `getAuthHeadersForApi()`: in browser when base is `/api`, return `{}` so proxy adds token; no client session check for those calls |
| “No session found” thrown before fetch | Same; throw when `!session` before calling fetch | Only require session when not using proxy (server); for browser + `/api`, fetch without header and handle 401 from response |
| Redirect to login on Inbox/Bookings | `InstructorInboxClient.tsx` and (app) pages catch 401 / “No session found” and call `router.replace('/instructor/login')` or `router.push('/instructor/login')` | Fix above removes the throw so no spurious redirect; real 401 from proxy still triggers redirect |
| Inconsistent API base default | `instructorApi.ts` getApiBaseUrl() used `127.0.0.1:3001`; `api/health` and proxy use `localhost:3001` | Default to `http://localhost:3001` everywhere (instructorApi, instructorApiServer) |
| No auth trace for debugging | middleware and proxy had no structured trace | Add single-line trace (pathname, hasCookie, cookieLen, hasSession; proxy: cookiePresent, tokenPresent, tokenLen, upstreamStatus), gated by AUTH_TRACE or dev |
| instructorApiServer required baseUrl or throw | `instructorApiServer.ts` getApiBaseUrl() returned `''` and fetchInstructorInboxServer threw if !baseUrl | Use same default `http://localhost:3001` so server works without env in dev |

---

## 3) Patch Set (applied)

### 3.1) `apps/instructor/lib/instructorApi.ts`

- **getApiBaseUrl()**  
  - Server default changed from `'http://127.0.0.1:3001'` to `'http://localhost:3001'`.
- **New helper**  
  - `getAuthHeadersForApi(): Promise<Record<string, string> | null>`  
  - In browser when `getApiBaseUrl() === '/api'` → return `{}`.  
  - Otherwise get session; if no `access_token` return `null`, else return `{ Authorization: 'Bearer ...' }`.
- **Proxy-backed client functions** now use `getAuthHeadersForApi()` and only throw “No session found” / “Not authenticated” when `authHeaders === null` (server or non-proxy):  
  - getConversations  
  - getMessages  
  - fetchInstructorInbox  
  - sendInstructorReply  
  - getConversationDraft  
  - useDraft  
  - ignoreDraft  
  - getKpiSummary  

So in the browser they no longer call `getSession()` for proxy calls; they send no `Authorization` and rely on the proxy to add it from the cookie.

### 3.2) `apps/instructor/lib/instructorApiServer.ts`

- **getApiBaseUrl()**  
  - Default when env not set: `'http://localhost:3001'` (was `''`).  
- **fetchInstructorInboxServer**  
  - Removed the `if (!baseUrl) throw ...` check; baseUrl now always has the default.

### 3.3) `apps/instructor/middleware.ts`

- **DEV_AUTH_TRACE**  
  - `process.env.NODE_ENV !== 'production' || process.env.AUTH_TRACE === '1'`.
- **Single-line trace** (when DEV_AUTH_TRACE):  
  - `pathname`, `hasCookie` (boolean), `cookieLen` (length of auth-token cookie value), `hasSession` (boolean).  
  - No cookie or token value logged.

### 3.4) `apps/instructor/app/api/instructor/[...path]/route.ts`

- **trace()**  
  - Already gated by DEV_AUTH_TRACE.
- **session-check trace** extended with:  
  - `cookiePresent`, `cookieLen`, `tokenPresent`, `tokenLen`, `hasSession`, `hasError`.  
  - No token or cookie value (no tokenDots).
- **upstream-status trace**  
  - Includes `upstreamStatus: upstream.status`.

---

## 4) Verification Checklist

### 4.1) Connectivity

```bash
# API up (from repo root)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health
# Expected: 200

# Next app health proxy (with Next running on 3012 or 3002)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/api/health
# Expected: 200 (or 502 if API is down)
```

- Ensure `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001` (or the real API URL). No need for `127.0.0.1` unless you specifically want it.

### 4.2) Auth and routing

1. **Login**  
   - Open `http://localhost:3012/instructor/login` (or 3002).  
   - Sign in with Supabase.  
   - Expect redirect to `/instructor/gate` or `/instructor/dashboard` (depending on approval/onboarding).

2. **Sidebar**  
   - From dashboard, click **Inbox** and **Bookings**.  
   - Expect no redirect to login; Inbox/Bookings load (or show empty/list).  
   - If the API returns 401 (e.g. invalid token), the UI should redirect to login only then.

3. **No session found**  
   - With a valid session (cookie set), Inbox and Bookings should not show “No session found” from client code.  
   - If they do, check:  
     - Requests go to same-origin `/api/instructor/...` (not directly to 3001).  
     - Cookie `sb-...-auth-token` is present (Path=/, SameSite=Lax or similar).  
     - With `AUTH_TRACE=1`, middleware and proxy logs show `hasSession: true` and `tokenPresent: true` for those requests.

### 4.3) Auth trace (dev only)

```bash
# Terminal 1: API
pnpm --filter @frostdesk/api dev

# Terminal 2: Instructor app with trace
AUTH_TRACE=1 pnpm --filter @frostdesk/instructor dev:3002
```

- Visit `/instructor/dashboard`, then Inbox.  
- In the Next server log you should see:  
  - `[auth-middleware] {"pathname":"/instructor/dashboard",...,"hasSession":true}`  
  - `[auth-proxy] session-check {... "cookiePresent":true,"tokenPresent":true,"upstreamStatus":200}`  
- No cookie or JWT value should appear in logs.

---

## 5) References

- **NEXT_PUBLIC_API_URL** usage: `apps/instructor/app/api/instructor/[...path]/route.ts`, `apps/instructor/app/api/health/route.ts`, `apps/instructor/lib/instructorApi.ts`, `apps/instructor/lib/instructorApiServer.ts`, `apps/instructor/components/shared/useApiHealth.ts`.
- **Redirects to login:** `(app)/layout.tsx` → `/instructor/login?next=/instructor/gate` when no session; `(pre)/gate`, `(pre)/onboarding`, etc. → same; client catch blocks → `router.replace('/instructor/login')` or `router.push('/instructor/login')` on 401.
- **Public routes (middleware):** `/instructor/login`, `/instructor/signup`, `/login`, `/signup`, `/instructor/auth/callback`, `/auth/callback`, `/api/*`, `/_next*`, `/favicon.ico`. All other `/instructor/*` require session or redirect to login.
