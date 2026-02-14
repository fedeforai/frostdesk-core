# Bookings proxy vs Fastify – audit (evidence only)

**Context:** Instructor app uses proxy for bookings list/detail/create; Fastify does not implement those endpoints. Evidence from repo + curl when API is running.

---

## 1) Instructor app uses proxy for bookings list/detail/create

### `apps/instructor/lib/instructorApi.ts`

- **getApiBaseUrl()** (lines 1785–1793): In browser returns `'/api'`; on server returns `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`).
- **fetchInstructorBookings()** (lines 435–470):
  - `url = baseUrl.replace(/\/$/, '') + '/instructor/bookings'`
  - Browser: **GET `/api/instructor/bookings`**
  - Uses `credentials: 'include'` and auth headers (empty in browser so proxy adds Bearer from cookie).
- **fetchInstructorBooking(id)** (lines 478–513):
  - `url = baseUrl.replace(/\/$/, '') + '/instructor/bookings/' + encodeURIComponent(id)`
  - Browser: **GET `/api/instructor/bookings/:id`**
- **createInstructorBooking(payload)** (lines 521–563):
  - `url = baseUrl.replace(/\/$/, '') + '/instructor/bookings'`
  - Browser: **POST `/api/instructor/bookings`**

So in the browser all three call **`/api/instructor/bookings`** (GET list, GET detail, POST create) via `getApiBaseUrl()` → `/api`.

### `apps/instructor/lib/instructorApiServer.ts`

- **getApiBaseUrl()** (lines 32–37): Returns `NEXT_PUBLIC_API_URL` (no `/api`; server talks to Fastify directly).
- **fetchInstructorBookingsServer()** (lines 77–92):
  - `url = base + '/instructor/bookings'` → **GET `{API_URL}/instructor/bookings`** (e.g. `http://localhost:3001/instructor/bookings`).
- **fetchInstructorBookingServer(id)** (lines 96–111):
  - `url = base + '/instructor/bookings/' + encodeURIComponent(id)` → **GET `{API_URL}/instructor/bookings/:id`**.

There is no server-side `createInstructorBooking`; create is only used from the client (`BookingForm.tsx`), which uses **POST `/api/instructor/bookings`** (proxy).

### Exact URLs called

| Function | Environment | Method | Exact URL |
|----------|-------------|--------|-----------|
| fetchInstructorBookings | Browser | GET | `/api/instructor/bookings` |
| fetchInstructorBooking(id) | Browser | GET | `/api/instructor/bookings/${id}` |
| createInstructorBooking | Browser | POST | `/api/instructor/bookings` |
| fetchInstructorBookingsServer | Server | GET | `{NEXT_PUBLIC_API_URL}/instructor/bookings` |
| fetchInstructorBookingServer(id) | Server | GET | `{NEXT_PUBLIC_API_URL}/instructor/bookings/${id}` |

So the app **does** use the proxy for list/detail/create in the browser (URLs under `/api/instructor/bookings`), and the server hits Fastify directly at `{API_URL}/instructor/bookings` and `.../bookings/:id`.

---

## 2) Fastify does NOT implement GET list, GET :id, POST create

### Search in `apps/api/src/routes/instructor`

- **GET /bookings** – not present (no `app.get('/instructor/bookings', ...)` or equivalent).
- **GET /bookings/:id** – not present.
- **POST /bookings** – not present (only POST to `.../bookings/:id/submit` etc.).

### Registered routes in `apps/api/src/routes/instructor/bookings.ts`

The file **only** registers:

| Method | Path | Handler |
|--------|------|---------|
| POST | `/instructor/bookings/:id/submit` | draft → pending |
| POST | `/instructor/bookings/:id/accept` | pending → confirmed |
| POST | `/instructor/bookings/:id/reject` | pending → declined |
| POST | `/instructor/bookings/:id/modify` | confirmed/modified → modified |
| POST | `/instructor/bookings/:id/cancel` | confirmed/modified → cancelled |

There are **no** handlers for:

- **GET** `/instructor/bookings`
- **GET** `/instructor/bookings/:id`
- **POST** `/instructor/bookings` (body: create payload)

So Fastify returns **404** for these three.

---

## 3) Proxy forwarding and 404

### How the proxy forwards

**File:** `apps/instructor/app/api/instructor/[...path]/route.ts`

- **Path construction (lines 64–68):**
  - `pathParams` = catch-all segments (e.g. for `/api/instructor/bookings` → `['bookings']`, for `/api/instructor/bookings/abc` → `['bookings', 'abc']`).
  - `backendPath = '/instructor/' + pathSegments.join('/')` → `/instructor/bookings` or `/instructor/bookings/abc`.
- **Backend URL (line 68):**
  - `backendUrl = API_BASE.replace(/\/$/, '') + backendPath + (query ? '?' + query : '')`
  - `API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`
- So:
  - **GET /api/instructor/bookings** → **GET `http://localhost:3001/instructor/bookings`**
  - **GET /api/instructor/bookings/{id}** → **GET `http://localhost:3001/instructor/bookings/{id}`**
  - **POST /api/instructor/bookings** → **POST `http://localhost:3001/instructor/bookings`**

The proxy returns whatever status and body the upstream (Fastify) returns. Since Fastify has no route for these, it returns **404**. The proxy then responds with **404** and the parsed JSON body (typically Fastify’s default 404 payload).

### Curl to confirm (run with `pnpm dev:instructor` and API on 3001)

With the API **not** running, curl to `localhost:3001` gives connection refused. With the API **running**, run:

```bash
# GET list (no auth → Fastify may return 404 before auth; with auth proxy returns same status)
curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/instructor/bookings

# GET detail (replace ID with any UUID)
curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/instructor/bookings/00000000-0000-0000-0000-000000000001

# POST create (no auth)
curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/instructor/bookings \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","startTime":"2025-02-15T10:00:00Z","endTime":"2025-02-15T11:00:00Z"}'
```

**Expected when Fastify is up:** All three return **HTTP 404** (and optionally a JSON body like `{"statusCode":404,"error":"Not Found"}` or similar). So the proxy **does** forward correctly and therefore returns **404** for list/detail/create.

---

## 4) Pass/fail table (mismatch)

| Check | Result | Evidence |
|-------|--------|----------|
| Instructor app (browser) calls GET `/api/instructor/bookings` | **PASS** | `instructorApi.ts`: `getApiBaseUrl()` + `/instructor/bookings`, GET |
| Instructor app (browser) calls GET `/api/instructor/bookings/:id` | **PASS** | `instructorApi.ts`: same base + `/instructor/bookings/${id}`, GET |
| Instructor app (browser) calls POST `/api/instructor/bookings` | **PASS** | `instructorApi.ts`: same base + `/instructor/bookings`, POST |
| Instructor app (server) calls GET `{API_URL}/instructor/bookings` | **PASS** | `instructorApiServer.ts`: `getApiBaseUrl()` + `/instructor/bookings` |
| Instructor app (server) calls GET `{API_URL}/instructor/bookings/:id` | **PASS** | `instructorApiServer.ts`: same base + `/instructor/bookings/${id}` |
| Proxy forwards `/api/instructor/*` to `{API_BASE}/instructor/*` | **PASS** | `route.ts`: `backendPath = '/instructor/' + pathSegments.join('/')`, `backendUrl = API_BASE + backendPath` |
| Fastify implements GET `/instructor/bookings` | **FAIL** | `bookings.ts`: no `app.get('/instructor/bookings', ...)` |
| Fastify implements GET `/instructor/bookings/:id` | **FAIL** | `bookings.ts`: no `app.get('/instructor/bookings/:id', ...)` |
| Fastify implements POST `/instructor/bookings` | **FAIL** | `bookings.ts`: no `app.post('/instructor/bookings', ...)` |
| Result for list/detail/create when using proxy / direct API | **404** | No route → Fastify 404 → proxy returns 404 |

**Conclusion:** Proxy and app usage are correct; the mismatch is that **Fastify does not implement** the three endpoints, so list/detail/create get **404**.

---

## 5) Minimal fix (exact file and handlers)

**File:** `apps/api/src/routes/instructor/bookings.ts`

**Add three handlers in `instructorBookingRoutes` (same auth pattern as existing POST handlers: `getUserIdFromJwt` → `getInstructorProfileByUserId` → `profile.id` as `instructorId`):**

1. **GET `/instructor/bookings`**  
   - Resolve `instructorId` from JWT/profile.  
   - Call `listInstructorBookings(instructorId)` from `@frostdesk/db` (`packages/db/src/booking_repository.ts`).  
   - Return `reply.send({ items: rows })` (or `{ ok: true, items }` if contract expects it).  
   - On no profile: 404.

2. **GET `/instructor/bookings/:id`**  
   - Resolve `instructorId` from JWT/profile.  
   - Load booking by `id` and enforce ownership (`instructor_id === instructorId`); e.g. use `getBookingById(id, instructorId)` or `getBookingByIdWithExpiryCheck(id, instructorId)` from `@frostdesk/db`.  
   - Return single booking or 404.

3. **POST `/instructor/bookings`**  
   - Parse body (customerName, startTime, endTime, serviceId?, meetingPointId?, notes?).  
   - Resolve `instructorId` from JWT/profile.  
   - Call `createBooking({ instructorId, customerName, startTime, endTime, serviceId, meetingPointId, notes })` from `@frostdesk/db`.  
   - Return `reply.send({ id: created.id })` (or `{ ok: true, id }` to match client expectation).

**Exports:** `listInstructorBookings`, `getBookingById` (or `getBookingByIdWithExpiryCheck`), and `createBooking` exist in `packages/db/src/booking_repository.ts` but are **not** currently exported from `packages/db/src/index.ts`. Either add them to the index exports (so the API can `import { listInstructorBookings, getBookingById, createBooking } from '@frostdesk/db'`) or import from the repository module. Use only the resolved `instructorId` from JWT/profile (no client-supplied instructor id). No new route files required; only add the three handlers in `bookings.ts`.

---

**End of audit.** All conclusions from repo code; curl commands can be run with API up to confirm 404 and, after the fix, 200.

---

## 6) After PR6: How to test via curl

With `pnpm dev:instructor` running (Next.js + API on 3001) and a valid instructor session (cookie or Bearer):

```bash
# List bookings (GET; requires auth)
curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/instructor/bookings \
  -H "Authorization: Bearer YOUR_JWT"

# Get one booking (replace ID with a real booking UUID)
curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/instructor/bookings/REAL_BOOKING_UUID \
  -H "Authorization: Bearer YOUR_JWT"

# Create booking (POST; requires auth)
curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/instructor/bookings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","startTime":"2025-02-15T10:00:00Z","endTime":"2025-02-15T11:00:00Z"}'
```

Via proxy (browser session): use `/api/instructor/bookings` and `/api/instructor/bookings/:id` with same method/body; cookies will be sent automatically. Expected: list/detail 200 with JSON; create 201 with `{ "id": "..." }`.
