# Environment Variables Audit — FrostDesk Monorepo

**Scope:** Next.js apps (instructor, admin), Node API (apps/api), shared packages (db, ai, integrations).  
**Policy:** No business logic changes; minimal safe fixes only; no new dependencies.

---

## Environment Variable Naming Convention (Authoritative)

### Frontend (Next.js apps: instructor, admin, human)

- **MUST use ONLY:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL`
- **API URL:** `NEXT_PUBLIC_API_URL` is the **only supported** API base URL variable for Next.js apps. Set it in the app’s `.env.local` (e.g. `apps/instructor/.env.local`, `apps/admin/.env.local`).
- **Deprecation:** `NEXT_PUBLIC_API_BASE_URL` is **deprecated**. A temporary fallback exists in code (NEXT_PUBLIC_API_URL preferred, then NEXT_PUBLIC_API_BASE_URL). Do not set or document it for new setups; migrate to `NEXT_PUBLIC_API_URL`.
- **No new NEXT_PUBLIC_\*** variables may be introduced without strong justification.

### Backend (Node API, Edge Functions, packages/db, packages/ai)

- **MUST use server-only variables (NO NEXT_PUBLIC_* in backend logic):**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - `META_VERIFY_TOKEN`
  - `META_WHATSAPP_TOKEN`
  - `META_WHATSAPP_PHONE_NUMBER_ID`
- Existing fallback chains in shared packages (e.g. `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL` in packages/db for compatibility) are kept; do not add new ones.

### Scripts / CLI

- Use **`API_BASE_URL`** only for scripts (e.g. admin_smoke, local tools). Do **not** use `API_BASE_URL` in runtime application code.
- Next.js apps must use `NEXT_PUBLIC_API_URL`; scripts may use `API_BASE_URL` (or the same value under that name in script env).

### Feature flags / kill switches

- `AI_EMERGENCY_DISABLE` remains server-only. Do not expose any kill switch via `NEXT_PUBLIC_*`.

---

## A) ENV AUDIT TABLE

| Variable | Where READ (file:line) | Runtime context | PUBLIC vs SERVER | REQUIRED vs OPTIONAL |
|----------|------------------------|-----------------|------------------|----------------------|
| **NEXT_PUBLIC_SUPABASE_URL** | instructor: supabaseServer.ts:9, supabaseBrowser.ts:9, middleware.ts:9, instructorApi.ts (many), instructorApiServer.ts:27, CompleteOnboardingButton.tsx:21; admin: adminApi.ts:9, requireAdmin.ts:4, getUserRole.ts:4, AdminAuthDebugPanel.tsx:49; human: humanApi.ts, humanObservabilityApi.ts | Next.js Server + Client (instructor/admin); Node (packages/db via fallback) | PUBLIC | REQUIRED for instructor/admin |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | instructor: supabaseServer.ts:10, supabaseBrowser.ts:10, middleware.ts:10, instructorApi.ts (many), CompleteOnboardingButton.tsx:22; admin: adminApi.ts:10, requireAdmin.ts:5, getUserRole.ts:5, AdminAuthDebugPanel.tsx:50 | Next.js Server + Client | PUBLIC | REQUIRED for instructor/admin |
| **NEXT_PUBLIC_API_URL** | instructor: instructorApi.ts:2012, instructorApiServer.ts:35; admin: adminApi.ts:3, AdminAuthDebugPanel.tsx:7, requireAdmin.ts:14, getUserRole.ts:14 | Next.js Client + Server (instructor) | PUBLIC | OPTIONAL (defaults: instructor '' then throw for inbox; admin http://localhost:3001) |
| **NEXT_PUBLIC_API_BASE_URL** | instructor: instructorApi.ts, instructorApiServer.ts (fallback only) | Next.js Client + Server | PUBLIC | **DEPRECATED** — use NEXT_PUBLIC_API_URL only; fallback kept temporarily |
| **SUPABASE_URL** | packages/db supabase_client.ts:12; api index.ts:42,47 (log); scripts supa_login.mjs:36, supa_login.cjs:29; vitest.setup.ts:8; loadEnv.test.ts:18 | Node API, scripts, tests | SERVER-ONLY | REQUIRED for API/db (or NEXT_PUBLIC_ fallback in db) |
| **SUPABASE_ANON_KEY** | packages/db supabase_client.ts:18; api index.ts:43–44 (log); scripts supa_login.*; vitest.setup.ts:11 | Node API, scripts, tests | SERVER-ONLY | REQUIRED for API/db (or fallbacks) |
| **SUPABASE_SERVICE_ROLE_KEY** | packages/db supabase_client.ts:17; api index.ts:43,46 (log) | Node API | SERVER-ONLY | OPTIONAL (anon key fallback in db) |
| **SUPABASE_JWT_SECRET** | scripts/gen_admin_jwt.mjs:38 | Script (CLI) | SERVER-ONLY | REQUIRED for script |
| **DATABASE_URL** | packages/db client.ts:3, client.js:2; api index.ts:16,39, admin.ts:59, debug.ts:27 | Node API, packages/db | SERVER-ONLY | REQUIRED |
| **PORT** | apps/api src/index.ts:5 | Node API | SERVER-ONLY | OPTIONAL (default 3001) |
| **HOST** | apps/api src/index.ts:6 | Node API | SERVER-ONLY | OPTIONAL (default 0.0.0.0) |
| **NODE_ENV** | api: server.ts:25, admin.ts:78, debug.ts:23,30, index.ts:20,40; admin: middleware.ts:11, pilot/page, dev-tools/page, page.tsx, AdminSidebar, AdminAuthDebugPanel, requireAdmin, getUserRole; packages/db feature_flag_service; packages/services feature_flag_service; api middleware rate_limit, inbound | Everywhere | (built-in) | Set by runtime / optional |
| **META_VERIFY_TOKEN** | apps/api routes/webhook.ts:65 | Node API | SERVER-ONLY | REQUIRED for WhatsApp webhook GET verification |
| **META_WHATSAPP_TOKEN** | apps/api integrations/whatsapp_cloud_api.ts:60, whatsapp_outbound.ts:35 | Node API | SERVER-ONLY | REQUIRED for WhatsApp send |
| **META_WHATSAPP_PHONE_NUMBER_ID** | apps/api integrations/whatsapp_cloud_api.ts:61 | Node API | SERVER-ONLY | REQUIRED for WhatsApp send |
| **AI_EMERGENCY_DISABLE** | packages/db ai_env_kill_switch.ts:22, system_health_repository.ts:53 | Node (db) | SERVER-ONLY | OPTIONAL ('true' = disable AI) |
| **AI_MODEL** | packages/db inbound_draft_orchestrator.ts:235 | Node (db) | SERVER-ONLY | OPTIONAL (default 'unknown') |
| **OPENAI_API_KEY** | .env.example only; no code read found in scanned paths | — | SERVER-ONLY | OPTIONAL / UNKNOWN (defined in .env, not read in grep) |
| **GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI** | packages/integrations google_calendar_adapter | Node (integrations) | SERVER-ONLY | When using Google Calendar |
| **GOOGLE_CALENDAR_ACCESS_TOKEN** | packages/db calendar_adapter.ts | Node (db) | SERVER-ONLY | When using calendar sync |
| **STRIPE_SECRET_KEY** | packages/db payment_adapter.ts | Node (db) | SERVER-ONLY | When using Stripe |
| **ALLOW_DEBUG_USER** | .env, .env.example, docs; **no application code reads it** (human_inbox route does not pass _skipAdminCheck from env) | — | SERVER-ONLY | OPTIONAL / currently UNUSED in code |
| **TEST_EMAIL / TEST_PASSWORD** | scripts/admin_smoke.mjs, supa_login.mjs, supa_login.cjs; gen_admin_jwt (SUB, EMAIL) | Scripts only | SERVER-ONLY | Scripts only |
| **API_BASE_URL** | scripts/admin_smoke.mjs:45 (different from NEXT_PUBLIC_API_URL) | Script | SERVER-ONLY | Optional for script (default 127.0.0.1:3001) |

**Notes:**

- **Instructor** Next app: reads only `NEXT_PUBLIC_*` (and uses them in both server and client). No server-only secrets in client bundle.
- **Admin** Next app: same; adminApi, requireAdmin, getUserRole use `NEXT_PUBLIC_SUPABASE_*` and `NEXT_PUBLIC_API_URL`.
- **API** loads env via `loadEnv.ts` (repo root `.env` or `apps/api/.env` first). Uses `DATABASE_URL`, `SUPABASE_*`, `META_*`, `NODE_ENV`.
- **packages/db**: `DATABASE_URL` required (client.ts throws if missing). Supabase client uses `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL` and key fallback chain.

---

## B) CRITICAL ISSUES (must fix)

1. **Instructor: `NEXT_PUBLIC_API_URL` empty in prod**  
   - **Where:** `instructorApiServer.ts` uses `getApiBaseUrl()`; if both `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_URL` are unset, `baseUrl` is `''`, then `fetchInstructorInboxServer()` throws.  
   - **Risk:** Inbox (and any server-side call to Node API) fails at runtime.  
   - **Fix (applied):** Throw with explicit message: "NEXT_PUBLIC_API_URL is required for instructor inbox. Set it in .env.local (see docs/ENV_AUDIT.md)." See "Environment Variable Naming Convention" above.

2. **Webhook verification: `META_VERIFY_TOKEN` undefined**  
   - **Where:** `apps/api/src/routes/webhook.ts:65` — `expectedToken = process.env.META_VERIFY_TOKEN`.  
   - **Risk:** If unset, `verifyToken === expectedToken` is false, so Meta subscription verification fails (webhook not registered). No crash but silent failure.  
   - **Fix (applied):** When `mode === 'subscribe'` and `META_VERIFY_TOKEN` is missing, return 500 with message "META_VERIFY_TOKEN is required for webhook verification. Set it in .env."

3. **Instructor middleware: missing Supabase env**  
   - **Where:** `apps/instructor/middleware.ts:9–11` — if `!url || !key`, returned `NextResponse.next()`.  
   - **Risk:** Auth refresh/cookie handling was skipped; session could appear broken with no error.  
   - **Fix (applied):** When env is missing, return 503 with plain-text message: "Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local".

---

## C) WARNINGS (should fix)

1. **Admin: HumanInboxPage hardcoded API base**  
   - **Where:** `apps/admin/components/inbox/HumanInboxPage.tsx:17` — `const API_BASE = 'http://127.0.0.1:3001'`.  
   - **Risk:** Inconsistency with rest of admin (adminApi uses `NEXT_PUBLIC_API_URL || 'http://localhost:3001'`). Different port/host for this component in non-default setups.  
   - **Fix:** Use `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` (and ensure the component is client so NEXT_PUBLIC_ is available).

2. **Naming inconsistency: `API_BASE_URL` vs `NEXT_PUBLIC_API_URL`**  
   - **Where:** Scripts use `API_BASE_URL` (admin_smoke.mjs); Next apps use `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_BASE_URL`.  
   - **Risk:** Confusion; scripts and apps may point at different backends if only one is set.  
   - **Fix:** Document in .env.example: "For Next apps use NEXT_PUBLIC_API_URL; for scripts API_BASE_URL (or same value)."

3. **`ALLOW_DEBUG_USER` defined but never read**  
   - **Where:** .env and .env.example define it; docs say it enables debug-user bypass for admin human-inbox.  
   - **Risk:** No code in apps/api reads it; human_inbox route never passes `_skipAdminCheck`. Feature is documented but disabled.  
   - **Fix:** Either implement (read in admin human_inbox route and pass _skipAdminCheck when ALLOW_DEBUG_USER=1 and userId=debug-user) or remove from .env.example and document as "reserved / not implemented".

4. **`OPENAI_API_KEY` in .env but not read in scanned code**  
   - **Where:** .env.example and .env.local contain it; no `process.env.OPENAI_API_KEY` in packages/ai or apps/api in the grep set.  
   - **Risk:** May be used by a dependency or another file; if required and missing, failure could be opaque.  
   - **Fix:** Confirm which package/route uses it; add a single place that validates (or documents) it when AI features are used. If unused, remove from .env.example or mark optional.

5. **Instructor: getSupabaseServer() returns null on missing env**  
   - **Where:** `apps/instructor/lib/supabaseServer.ts:9–11` — if !url or !key, returns null. Layout and gate then redirect to login.  
   - **Risk:** User sees redirect loop or "not authenticated" instead of a clear "misconfiguration" error.  
   - **Fix:** Optional but recommended: in development, if env is missing, log a clear warning or render a small banner so devs know to set NEXT_PUBLIC_SUPABASE_*.

---

## D) SAFE IMPROVEMENTS (optional)

1. **Centralize required-env checks for API**  
   - After loadEnv, assert required vars (e.g. DATABASE_URL, SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, META_VERIFY_TOKEN if webhook is used) and exit with a single "Missing: X, Y" message instead of failing later in routes.

2. **Document where each app loads .env**  
   - Next.js: each app (instructor, admin) loads its own app-level .env.local / .env.  
   - API: loadEnv.ts loads repo root or apps/api .env.  
   - Add one line to README or docs/ENV_AUDIT.md: "Instructor/Admin: set NEXT_PUBLIC_* in apps/<app>/.env.local. API: set SERVER vars in repo root .env or apps/api/.env."

3. **Supabase separation**  
   - Frontend (instructor, admin): only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY — already the case.  
   - API / packages/db: use SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY — no NEXT_PUBLIC_ in server-only code except in packages/db fallback (acceptable for shared package).  
   - No server-only secrets are exposed to the client bundle.

---

## E) REQUIRED ENV CHECKLIST

### Local dev

| App / process | Required |
|---------------|----------|
| **apps/instructor** | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY; NEXT_PUBLIC_API_URL if using inbox/dashboard/KPIs; Supabase Edge Functions (same origin) for bookings, profile, audit logs |
| **apps/admin** | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY; NEXT_PUBLIC_API_URL (defaults to http://localhost:3001) |
| **apps/api** | DATABASE_URL, SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY); META_VERIFY_TOKEN for webhook; META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID for WhatsApp send |
| **packages/db** (via API) | DATABASE_URL; Supabase vars same as API |

### Production

| App / process | Required |
|---------------|----------|
| **apps/instructor** | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY; NEXT_PUBLIC_API_URL (must be set; no safe default) |
| **apps/admin** | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY; NEXT_PUBLIC_API_URL (API base URL) |
| **apps/api** | DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY; META_VERIFY_TOKEN; META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID if using WhatsApp |

---

## F) NEXT.JS SPECIFIC

- **Client components:** All env used in client (instructorApi, adminApi, HumanInboxPage, AdminAuthDebugPanel, CompleteOnboardingButton, etc.) are NEXT_PUBLIC_* — correct.
- **Server-only secrets:** None are NEXT_PUBLIC_*; Supabase service role and API secrets are server-only — correct.
- **Layouts / middleware / server:** Instructor layout guard and gate use getSupabaseServer(); when it returns null they redirect to login. They do not "fail fast" with an explicit env error; see Critical #3 and Warning #5 for optional improvements.

---

## G) SUPABASE-SPECIFIC

- **Frontend (instructor, admin):** Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY — correct.
- **API / packages/db:** createDbClient() uses SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY — correct for a shared package used by API (which can set either set of vars).
- **No accidental cross-usage:** No NEXT_PUBLIC_* in API route logic; only in db fallback and in logs for dev. Safe.

---

## H) RUNTIME VALIDATION RISKS (summary)

- **process.env may be undefined:** META_VERIFY_TOKEN (Critical #2); NEXT_PUBLIC_API_URL for instructor inbox (Critical #1); instructor middleware (Critical #3).
- **Silent or soft failures:** Middleware continues without Supabase; webhook verification fails without clear error; inbox throws generic NO_API_URL.
- **getSupabaseServer(), auth, API base URLs:** Covered above; no silent leak of secrets, but missing env can cause redirects or runtime errors that are not always self-explanatory.

---

---

## I) FIXES APPLIED (minimal, safe)

- **Critical #1:** instructorApiServer throws with explicit message when API URL is missing (instructor inbox).
- **Critical #2:** Webhook GET /webhook returns 500 with clear message when `META_VERIFY_TOKEN` is missing in subscribe mode.
- **Critical #3:** Instructor middleware returns 503 with plain-text message when Supabase env is missing (no silent skip).

Other items in B/C remain as recommendations (e.g. HumanInboxPage API_BASE, ALLOW_DEBUG_USER, OPENAI_API_KEY usage).

---

## J) IDENTITY RULES (DB)

- **Canonical identity:** `auth.users` is the single source of truth for user identity (Supabase Auth).
- **Instructor identity:** `public.instructor_profiles.id` must equal `auth.users.id` (FK). One row per instructor; no orphan rows—instructor_profiles must reference an existing auth user.
- **Admin identity:** `public.admin_users.user_id` must equal `auth.users.id` (FK). Admin access is determined by presence in this table (and optional `role` column).

---

## K) INSTRUCTOR: API AND FETCH TROUBLESHOOTING

If the instructor app shows **"API disconnected"**, **"Failed to fetch"**, or **"Couldn't load…"** on Dashboard, Inbox, Services, Availability, Policies, Bookings, etc.:

1. **Node API (Dashboard, Inbox, KPIs, conversations)**  
   Set `NEXT_PUBLIC_API_URL` in `apps/instructor/.env.local` (e.g. `http://localhost:3001`) and ensure **apps/api** is running. Health check and data calls use this URL.

2. **Supabase Edge Functions (Bookings, Profile, Audit logs, AI booking context)**  
   The instructor app also calls Supabase Edge Functions at `NEXT_PUBLIC_SUPABASE_URL/functions/v1/...`. Ensure Supabase project and Edge Functions are deployed and reachable; auth uses the same session (cookies).

3. **Local dev checklist**  
   - `apps/api` running (e.g. `pnpm --filter api dev`).  
   - `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SUPABASE_*` set in `apps/instructor/.env.local`.  
   - Supabase project has the instructor Edge Functions deployed if you use bookings/profile/server-side instructor APIs.

Pages are built to degrade gracefully (empty lists, Retry button) when the API or fetch fails; fixing the env and running the backend removes the errors.

*End of audit.*
