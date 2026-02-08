# Admin route coverage audit — Security protocol

**Purpose:** Ensure every `/admin/*` route is protected by JWT-based auth and that no route trusts client-provided identity.  
**Type:** Design/process only. No code changes in this document. Executable by a developer from the terminal.

**Reference:** [TA-1 — Identity & Auth](architecture/TA-1_IDENTITY_AUTH.md); [TA-1 Review checklist](architecture/TA-1_IDENTITY_AUTH.md#10-review-checklist).

---

## 1. Exact grep commands (run from repo root)

Run these from the project root (e.g. `~/Desktop/frostdesk-core` or `$(git rev-parse --show-toplevel)`).

### 1.1 List all admin route definitions

Find every place an admin route is registered (path contains `/admin`):

```bash
cd "$(git rev-parse --show-toplevel)"
rg -n "\.(get|post|put|patch|delete)\s*\(\s*['\"]\/admin" apps/api/src/routes/admin.ts apps/api/src/routes/admin/
```

**Interpretation:** Each hit is one route. Record each in the coverage table (section 4).

### 1.2 Forbidden patterns — must be zero in admin code

**A) Client-provided userId in query:**

```bash
rg -n "request\.query\.userId|request\.query as.*userId|query\s*\.\s*userId" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --type-add 'ts:*.ts' -t ts
```

**Expected:** No matches. Any match = fail.

**B) Client-provided userId in header (x-user-id):**

```bash
rg -n "x-user-id|['\"]x-user-id['\"]" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --type-add 'ts:*.ts' -t ts
```

**Expected:** No matches in route handlers or helpers used by them. Any match = fail.

**C) getUserId(request) or equivalent helper that reads from request:**

```bash
rg -n "getUserId\s*\(|getUserId\s*=" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --type-add 'ts:*.ts' -t ts
```

**Expected:** No matches. The only acceptable pattern is `requireAdminUser(request)` (and in `admin.ts`, `getUserIdFromJwt` only for `GET /admin/check`). Any other getUserId = fail.

**D) Combined forbidden (single run):**

```bash
rg -n "request\.query\.userId|request\.headers\[.x-user-id|x-user-id|getUserId\s*\(" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ \
  --glob '!*.test.ts' --glob '!*.spec.ts' --type-add 'ts:*.ts' -t ts
```

**Expected:** No matches. If any match appears, the file/line must be fixed before declaring coverage.

### 1.3 Required pattern — every admin route must use JWT-derived identity

**A) Routes that must call requireAdminUser (or getUserIdFromJwt for /admin/check only):**

First, list all admin route paths:

```bash
rg -o -n "\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --replace '$2' | sort -u
```

**B) Confirm requireAdminUser is used in every admin file (and in admin.ts for all routes except /admin/check):**

```bash
rg -n "requireAdminUser\s*\(" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --type-add 'ts:*.ts' -t ts
```

**Interpretation:** Every admin route handler (except the one serving `GET /admin/check`) must contain a call to `requireAdminUser(request)` (or `await requireAdminUser(request)`). The handler for `GET /admin/check` must use `getUserIdFromJwt(request)` and `isAdmin(userId)` and must not trust query/header. Manually verify each route in the table (section 4) has the correct auth.

**C) Count of requireAdminUser calls (sanity check):**

```bash
rg -c "requireAdminUser\s*\(" apps/api/src/routes/admin.ts apps/api/src/routes/admin/ --type-add 'ts:*.ts' -t ts
```

Use this to ensure the number of protected handlers matches the number of admin routes (minus one for /admin/check if it uses getUserIdFromJwt only).

---

## 2. Forbidden patterns (summary)

| Pattern | Example | Why forbidden |
|---------|---------|----------------|
| `request.query.userId` | `const userId = (request.query as any)?.userId` | Client can send any userId; privilege escalation. |
| `request.headers['x-user-id']` | `request.headers['x-user-id'] as string` | Same; identity must come from JWT only. |
| `getUserId(request)` (helper that reads query/header) | `const userId = getUserId(request)` | Such a helper trusts client input; must not exist in admin routes. |
| Any use of query/header for identity in admin handlers | `request.query.id`, custom `x-*` for user | Only `requireAdminUser(request)` or, for /admin/check only, `getUserIdFromJwt(request)` + DB check. |
| Bypass logic (env, special header) that skips JWT or isAdmin | `ALLOW_DEBUG_USER`, `skipAdminCheck` | TA-1: no bypass in production path. |

**Rule:** In admin route handlers and any helper they call for auth, the only allowed source of identity is the return value of `getUserIdFromJwt(request)` or `requireAdminUser(request)`. No other reading of `userId` from the request.

---

## 3. Required patterns

| Requirement | Where | Example |
|-------------|--------|---------|
| **requireAdminUser(request)** | Every admin route **except** `GET /admin/check` | `const userId = await requireAdminUser(request);` at start of handler (after which handler uses this `userId` only). |
| **getUserIdFromJwt + isAdmin** | Only for `GET /admin/check` | That route returns `{ ok, isAdmin }` and must not trust query/header; it uses `getUserIdFromJwt(request)` then `isAdmin(userId)`. |
| **No identity from client** | All admin routes | No `request.query.userId`, no `x-user-id`, no body field used as identity for authorization. |

**Rule:** Every `/admin/*` route must enforce identity via one of: (a) `requireAdminUser(request)`, or (b) for `/admin/check` only, `getUserIdFromJwt(request)` plus `isAdmin(userId)`.

---

## 4. Route coverage table (template)

Fill this table by running the commands in section 1 and inspecting each file. Record **auth method used** and **pass/fail** per route.

| # | File | Route (method + path) | Auth method used | Pass / Fail |
|---|------|------------------------|------------------|-------------|
| 1 | `apps/api/src/routes/admin.ts` | GET /admin/check | getUserIdFromJwt + isAdmin (no client userId) | |
| 2 | `apps/api/src/routes/admin.ts` | GET /admin/user-role | requireAdminUser | |
| 3 | `apps/api/src/routes/admin.ts` | GET /admin/conversations | requireAdminUser | |
| 4 | `apps/api/src/routes/admin.ts` | GET /admin/bookings | requireAdminUser | |
| 5 | `apps/api/src/routes/admin.ts` | POST /admin/bookings/:id/override-status | requireAdminUser | |
| 6 | `apps/api/src/routes/admin.ts` | GET /admin/bookings/:id | requireAdminUser | |
| 7 | `apps/api/src/routes/admin.ts` | GET /admin/messages | requireAdminUser | |
| 8 | `apps/api/src/routes/admin/feature_flags.ts` | GET /admin/feature-flags/:key | requireAdminUser | |
| 9 | `apps/api/src/routes/admin/human_inbox.ts` | GET /admin/human-inbox | requireAdminUser | |
| 10 | `apps/api/src/routes/admin/human_inbox_detail.ts` | GET /admin/human-inbox/:conversationId | requireAdminUser | |
| 11 | `apps/api/src/routes/admin/booking_lifecycle.ts` | GET /admin/bookings/:bookingId/lifecycle | requireAdminUser | |
| 12 | `apps/api/src/routes/admin/intent_confidence.ts` | GET /admin/intent-confidence | requireAdminUser | |
| 13 | `apps/api/src/routes/admin/ai_gating.ts` | GET /admin/conversations/:conversationId/ai-gating | requireAdminUser | |
| 14 | `apps/api/src/routes/admin/ai_draft.ts` | GET /admin/conversations/:conversationId/ai-draft | requireAdminUser | |
| 15 | `apps/api/src/routes/admin/send_ai_draft.ts` | POST /admin/conversations/:conversationId/send-ai-draft | requireAdminUser | |
| 16 | `apps/api/src/routes/admin/ai_quota.ts` | GET /admin/ai-quota | requireAdminUser | |
| 17 | `apps/api/src/routes/admin/system_health.ts` | GET /admin/system-health | requireAdminUser | |
| 18 | `apps/api/src/routes/admin/system_degradation.ts` | GET /admin/system-degradation | requireAdminUser | |
| 19 | `apps/api/src/routes/admin/dashboard.ts` | GET /admin/dashboard | requireAdminUser | |
| 20 | `apps/api/src/routes/admin/kpi.ts` | GET /admin/kpi | requireAdminUser | |
| 21 | `apps/api/src/routes/admin/conversation_timeline.ts` | GET /admin/conversations/:conversationId/timeline | requireAdminUser | |
| 22 | `apps/api/src/routes/admin/outbound_message.ts` | POST /admin/messages/outbound | requireAdminUser | |
| 23 | `apps/api/src/routes/admin/conversation_ai_mode.ts` | POST /admin/conversations/:id/ai-mode | requireAdminUser | |
| 24 | `apps/api/src/routes/admin/instructor_whatsapp.ts` | POST /admin/instructor/whatsapp/verify | requireAdminUser | |

**Notes:**

- If new admin routes are added, append rows and re-run the grep commands.
- Routes in commented-out code (e.g. `ai_feature_flags.ts`) do not need a row until the route is enabled; when enabled, they must use requireAdminUser and be added to the table.

---

## 5. Acceptance criteria — "admin surface covered"

Declare **admin route coverage** only when all of the following hold:

| # | Criterion | Check |
|---|-----------|--------|
| 1 | **Zero forbidden patterns** | Section 1.2 (A–D) grep commands return no matches in admin route files (excluding tests). |
| 2 | **Every route in table has correct auth** | Each row in section 4 has "Auth method used" = requireAdminUser (or, for GET /admin/check only, getUserIdFromJwt + isAdmin) and Pass = Yes. |
| 3 | **No route omitted** | Every route returned by the "list all admin route definitions" command (1.1) appears in the coverage table with a Pass/Fail. |
| 4 | **requireAdminUser present** | Every admin route file (and every handler in admin.ts except /admin/check) contains at least one call to `requireAdminUser(request)`. |
| 5 | **No getUserId(request)** | No admin route file defines or calls a helper that reads userId from request query or headers (getUserId-style). |

**If any criterion fails:** Do not declare coverage. Fix the code (or add the missing route to the table and fix its auth), then re-run the protocol.

---

## 6. Quick-run script (optional)

You can run the forbidden-pattern check in one go and interpret exit code:

```bash
cd "$(git rev-parse --show-toplevel)"
if rg -q "request\.query\.userId|request\.headers\[.x-user-id|x-user-id|getUserId\s*\(" \
  apps/api/src/routes/admin.ts apps/api/src/routes/admin/ \
  --glob '!*.test.ts' --glob '!*.spec.ts' --type-add 'ts:*.ts' -t ts 2>/dev/null; then
  echo "FAIL: Forbidden pattern found in admin routes."
  exit 1
else
  echo "PASS: No forbidden patterns in admin routes (manual table check still required)."
  exit 0
fi
```

**Note:** A passing run only means no forbidden patterns were found. You must still complete the coverage table (section 4) and verify each route uses requireAdminUser (or /admin/check pattern) to declare full coverage.
