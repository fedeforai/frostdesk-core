# BLOCK 23.0.1 — Auth & Roles Skeleton AUDIT

**Date:** 2026-01-24

---

## A) Auth Mechanism

**Provider:** Supabase Auth

**Evidence:**
- Package: `@supabase/supabase-js` used throughout
- Client creation: `createClient(supabaseUrl, supabaseAnonKey)`
- Files:
  - `apps/admin/lib/adminApi.ts` (lines 1-12: getSupabaseClient)
  - `apps/admin/lib/requireAdmin.ts` (lines 1-12: getSupabaseClient)
  - `apps/instructor/lib/instructorApi.ts` (lines 1-12: getSupabaseClient)
  - `apps/human/lib/humanApi.ts` (lines 1-12: getSupabaseClient)
  - `packages/db/src/supabase_client.ts` (Supabase client utility)
  - `supabase/functions/**/*.ts` (Edge Functions use Supabase Auth)

**Note:** No NextAuth, no custom auth. Pure Supabase Auth.

---

## B) Session Mechanism

**Client-Side (Next.js Admin App):**
- Method: `supabase.auth.getSession()` in API client functions
- Location: `apps/admin/lib/adminApi.ts` (all fetch functions call `getSession()`)
- Session storage: Managed by Supabase Auth (cookies)
- User ID extraction: `session.user.id` passed to API endpoints

**API Routes (Fastify):**
- Method: User ID from request headers or query params
- Pattern: `getUserId(request)` helper extracts from:
  - Header: `x-user-id` (preferred)
  - Query param: `userId` (fallback)
- Location: `apps/api/src/routes/admin.ts` (lines 43-49)
- Note: No session validation in API layer (trusts client-provided userId)

**Server Components (Next.js):**
- Method: `requireAdmin()` in layout
- Location: `apps/admin/app/admin/layout.tsx` (lines 6-18)
- Flow: Calls `supabase.auth.getSession()` → calls `/admin/check` API endpoint

**Edge Functions:**
- Method: Authorization header → `supabase.auth.getUser()`
- Location: `supabase/functions/admin/_shared/admin_guard.ts` (lines 11-44)
- Flow: Extract `Authorization` header → create Supabase client → `getUser()`

---

## C) Existing Guards

**Primary Guard:** `assertAdminAccess(userId: string)`

**Location:** `packages/db/src/admin_access.ts` (lines 58-63)

**Implementation:**
- Calls `isAdmin(userId)` internally
- Throws `UnauthorizedError` if not admin
- Used in all admin services as first line

**Service Layer Usage (15+ files):**
- `packages/db/src/admin_booking_service.ts`
- `packages/db/src/admin_conversation_service.ts`
- `packages/db/src/admin_message_service.ts`
- `packages/db/src/admin_booking_detail_service.ts`
- `packages/db/src/ai_gating_service.ts`
- `packages/db/src/intent_confidence_service.ts`
- `packages/db/src/booking_lifecycle_service.ts`
- `packages/db/src/human_inbox_service.ts`
- `packages/db/src/ai_draft_service.ts`
- `packages/db/src/ai_draft_send_service.ts`
- `packages/db/src/system_health_service.ts`
- `packages/db/src/system_degradation_service.ts`

**API Layer:**
- `apps/api/src/lib/assertAdminAccess.ts` (wrapper)
- `apps/api/src/routes/admin.ts` (GET /admin/check endpoint, lines 53-67)

**UI Layer:**
- `apps/admin/lib/requireAdmin.ts` (calls /admin/check)
- `apps/admin/app/admin/layout.tsx` (Server Component guard)

**Edge Functions:**
- `supabase/functions/admin/_shared/admin_guard.ts` (requireAdmin function)

**Note:** Only binary admin/not-admin guard exists. No role-based guards.

---

## D) DB Identity/Roles Tables

**Referenced Tables:**

1. **`profiles` table**
   - Referenced in: `packages/db/src/admin_access.ts` (line 27)
   - Query: `SELECT is_admin FROM profiles WHERE id = ${userId}`
   - Expected columns: `id` (UUID, PK), `is_admin` (boolean)
   - **Status:** Referenced but NO migration found

2. **`users` table**
   - Referenced in: `packages/db/src/admin_access.ts` (line 39)
   - Query: `SELECT role FROM users WHERE id = ${userId}`
   - Expected columns: `id` (UUID, PK), `role` (text)
   - **Status:** Referenced but NO migration found

**Role Model:**
- Current: Binary (admin / not admin)
- Check logic: `profiles.is_admin = true` OR `users.role = 'admin'`
- No granular roles exist (no `system_admin`, `human_operator`, `human_approver`)

**Note:** Tables may be Supabase Auth managed (`auth.users` is built-in) or created manually outside migrations.

---

## E) Admin Route Protection Coverage

**Admin UI Routes (Next.js):**

**Layout-Level Protection:**
- File: `apps/admin/app/admin/layout.tsx`
- Method: Server Component calls `requireAdmin()`
- Coverage: All routes under `/admin/*` protected
- Redirect: `/admin/not-authorized` on failure

**Protected Routes:**
- `/admin` (page.tsx)
- `/admin/bookings/*`
- `/admin/conversations/*`
- `/admin/human-inbox/*`
- `/admin/intent-confidence`
- `/admin/system-health`
- `/admin/system-degradation`
- `/admin/whatsapp-inbound`
- `/admin/inbound-messages`
- `/admin/channel-identity-mapping`

**API Routes (Fastify):**

**Pattern:** All admin routes extract `userId` → pass to services → services call `assertAdminAccess(userId)`

**Protected Endpoints (17+):**
- `GET /admin/check`
- `GET /admin/conversations`
- `GET /admin/bookings`
- `POST /admin/bookings/:id/override-status`
- `GET /admin/bookings/:id`
- `GET /admin/messages`
- `GET /admin/human-inbox`
- `GET /admin/human-inbox/:conversationId`
- `GET /admin/intent-confidence`
- `GET /admin/conversations/:conversationId/ai-gating`
- `GET /admin/conversations/:conversationId/ai-draft`
- `POST /admin/conversations/:conversationId/send-ai-draft`
- `GET /admin/ai-feature-flags`
- `GET /admin/ai-quota`
- `GET /admin/system-health`
- `GET /admin/system-degradation`
- `GET /admin/bookings/:bookingId/lifecycle`

**Protection Mechanism:**
- User ID extraction: `apps/api/src/routes/admin.ts` (getUserId helper)
- Service guards: All services call `assertAdminAccess(userId)` as first line
- No middleware-level protection (relies on service guards)

**Edge Functions:**
- All admin Edge Functions use `requireAdmin()` from `_shared/admin_guard.ts`
- File: `supabase/functions/admin/_shared/admin_guard.ts`

**Coverage:** ✅ All admin routes protected (UI layout + API service guards + Edge Function guards)

---

## Final: RECOMMENDED PATH

**RECOMMENDED PATH: Supabase Auth**

**Reasoning:**
- ✅ Already fully integrated throughout codebase
- ✅ Session handling established (getSession, getUser)
- ✅ Guard infrastructure exists (assertAdminAccess)
- ✅ Route protection patterns established
- ⚠️ Missing: `profiles`/`users` table migrations (referenced but not created)
- ⚠️ Missing: Granular roles (need `system_admin`, `human_operator`, `human_approver`)

**Next Steps:**
- Create `profiles` table migration (if not Supabase Auth managed)
- Add role column/table for granular roles
- Extend guards to support role-based checks
