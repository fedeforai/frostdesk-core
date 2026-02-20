# Instructor dashboard/conversations timeout patch plan

**Goal:** Eliminate Vercel `FUNCTION_INVOCATION_TIMEOUT` (300s) on:
- `GET /api/instructor/dashboard`
- `GET /api/instructor/conversations`
- Related KPI endpoints.

**Constraints:** No architecture rewrite; keep repository pattern; add instrumentation + timing; hard timeouts for external/DB; fast-path partial data; pagination/limits; no new DB tables.

---

## 1) Route handlers and slow operations

| Endpoint | Handler file | Slow operations |
|----------|--------------|------------------|
| `GET /instructor/dashboard` | `apps/api/src/routes/instructor/dashboard.ts` | `getUserIdFromJwt`, `getInstructorProfileByUserId`, `getInstructorDashboardData` (7 sequential DB queries: instructor, services, meetingPoints, policies, availability, calendar, upcomingBookings) |
| `GET /instructor/conversations` | `apps/api/src/routes/instructor/conversations.ts` | `getUserIdFromJwt`, `getInstructorProfileByUserId`, `getInstructorInbox` (single heavy CTE with joins + correlated subquery) |
| `GET /instructor/kpis/revenue` | `apps/api/src/routes/instructor/kpis.ts` | `getUserIdFromJwt`, `getInstructorProfileByUserId`, `getRevenueKpi` |
| `GET /instructor/kpis/funnel` | same | same + `getFunnelKpi` |
| `GET /instructor/kpis/business` | same | same + `getBusinessKpi` |
| `GET /instructor/kpis/summary` | `apps/api/src/routes/instructor/drafts.ts` | `getUserIdFromJwt`, `getInstructorProfileByUserId`, `getInstructorDraftKpiSummary` |

---

## 2) Files touched and changes

### New file

- **`apps/api/src/lib/timing.ts`**  
  - `now()`, `elapsedMs()`, `logTiming(route, operation, startMs, extra?)`, `withTimeout(promise, ms, label)`.

### Modified files

- **`packages/db/src/client.ts`**  
  - Use `DATABASE_URL` (unchanged).  
  - Added options: `max` (2 in serverless, 10 otherwise), `idle_timeout: 20`, `connect_timeout: 10` for pooling and fast failure.

- **`packages/db/src/instructor_dashboard_repository.ts`**  
  - Added `LIMIT 50` to services, meetingPoints, policies; `LIMIT 100` to availability (upcomingBookings already had `LIMIT 10`).

- **`packages/db/src/instructor_inbox_repository.ts`**  
  - `getInstructorInbox(instructorId, limit?)` with default `limit = 20`, capped 1–100.  
  - SQL: `LIMIT ${cappedLimit}` at end of query.

- **`apps/api/src/routes/instructor/dashboard.ts`**  
  - Removed ENV CHECK log.  
  - Timing: `logTiming(ROUTE, 'getUserIdFromJwt'|'getInstructorProfileByUserId'|'getInstructorDashboardData'|'total')`.  
  - Route timeout 15s (was 25s).  
  - Fast-path: if elapsed before data fetch > 8s, return `minimalDashboardPayload(profile)` (instructor + empty arrays + `calendar: { connected: false }` + `_fastPath: true`).  
  - `getInstructorDashboardData` wrapped in `withTimeout(..., 10_000)`: on timeout return same minimal payload.

- **`apps/api/src/routes/instructor/conversations.ts`**  
  - Timing: `logTiming(ROUTE_LIST, 'getUserIdFromJwt'|'getInstructorProfileByUserId'|'getInstructorInbox'|'total')`.  
  - `getInstructorInbox(profile.id, INBOX_LIMIT)` with `INBOX_LIMIT = 20`.  
  - `withTimeout(getInstructorInbox(...), 12_000)`: on timeout return `{ ok: true, conversations: [] }`.

- **`apps/api/src/routes/instructor/kpis.ts`**  
  - Shared `handleKpiRoute(route, request, reply, fetchData)` with timing and `withTimeout(fetchData(...), 10_000)`.  
  - On KPI query timeout return 503 `{ ok: false, error: 'INTERNAL_ERROR', message: 'KPI query timed out' }`.

- **`apps/api/src/routes/instructor/drafts.ts`**  
  - `GET /instructor/kpis/summary`: timing logs + `withTimeout(getInstructorDraftKpiSummary(...), 10_000)`; on timeout return 503.

---

## 3) Database connection and env

- **Env:** Backend uses `DATABASE_URL` (root or `apps/api/.env`). Use pooler URL (e.g. Supabase pooler) with `?sslmode=require` in local envs.  
- **Pooling:** `packages/db` uses `postgres` (postgres.js) with `max: 2` when `VERCEL === '1'` or `AWS_LAMBDA_FUNCTION_NAME` is set, else `max: 10`; `connect_timeout: 10`, `idle_timeout: 20`.  
- No new env vars; no Prisma.

---

## 4) Fast-path and caps summary

| Endpoint | Cap / fast-path |
|----------|------------------|
| Dashboard | Return minimal payload (instructor + empty lists + calendar disconnected) if elapsed > 8s or `getInstructorDashboardData` times out (10s). |
| Conversations | Limit 20 conversations; on `getInstructorInbox` timeout (12s) return `{ ok: true, conversations: [] }`. |
| KPIs (revenue/funnel/business/summary) | 10s timeout on the KPI query; 503 on timeout. |

---

## 5) Local test protocol

1. **Env:** Ensure `DATABASE_URL` is set (e.g. in root `.env` or `apps/api/.env`).
2. **Start API:** From repo root: `pnpm --filter api dev` (or `cd apps/api && pnpm dev`). Listen on port 3001.
3. **Auth:** Obtain a valid JWT (e.g. log in to instructor app, copy Bearer from Network tab or use a test token).
4. **Dashboard:**
   ```bash
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/instructor/dashboard
   ```
   - Expect 200 and JSON with `instructor`, `services`, `conversations`, etc.  
   - If fast-path: response includes `_fastPath: true` and empty arrays.
5. **Conversations:**
   ```bash
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/instructor/conversations
   ```
   - Expect 200 and `{ "ok": true, "conversations": [ ... ] }` with at most 20 items.
6. **KPIs:**
   ```bash
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer YOUR_JWT" "http://localhost:3001/instructor/kpis/funnel?window=7d"
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer YOUR_JWT" "http://localhost:3001/instructor/kpis/summary?window=7d"
   ```
7. **Logs:** In the API process stdout, look for `[timing]` lines with `route`, `operation`, `durationMs`.

---

## 6) Production verification protocol

1. **Instructor app on Vercel:** Use the app in production (or staging) and open the dashboard. Confirm it loads without 504 and that conversations list appears (or “No conversations”).
2. **curl to production API** (if API is publicly reachable):
   ```bash
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer PROD_JWT" "https://YOUR_API_URL/instructor/dashboard"
   curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer PROD_JWT" "https://YOUR_API_URL/instructor/conversations"
   ```
   Replace `YOUR_API_URL` (e.g. Railway URL) and use a valid instructor JWT.
3. **Vercel logs:** In Vercel project → Logs / Functions, filter by the instructor proxy route (e.g. `/api/instructor/dashboard`, `/api/instructor/conversations`).  
   - Confirm no `FUNCTION_INVOCATION_TIMEOUT`.  
   - If the backend is also on Vercel, check backend function logs for `[timing]` and confirm durationMs stay under the configured timeouts (e.g. &lt; 15s).

---

## 7) Optional: query param for conversations limit

The conversations list is fixed at 20. If you later want a client override (e.g. `?limit=50`), add in `conversations.ts`:

- Parse `request.query.limit`, e.g. `const limit = Math.min(100, Math.max(1, parseInt(String(request.query?.limit), 10) || 20));`
- Call `getInstructorInbox(profile.id, limit)`.

No such change was applied in this patch.
