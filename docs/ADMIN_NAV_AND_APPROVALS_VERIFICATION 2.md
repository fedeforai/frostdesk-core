# Admin navigation and instructor approvals — verification and fixes

## Summary

- **A) One sidebar:** Layout `apps/admin/app/admin/layout.tsx` renders `AdminSidebar` only. `HumanInboxPage` does **not** use AppShell (already fixed earlier).
- **B) Sidebar hrefs:** All match existing pages: `/admin/dashboard`, `/admin/instructor-approvals`, `/admin/pilot`, `/admin/human-inbox`, `/admin/bookings`, `/admin/calendar`, `/admin/system-health`.
- **C) Approvals UX:** Error banner now shows HTTP status, error code, message, and a **Retry** button. API errors attach `status` and `error` (code) to the thrown object.
- **D) API on :3001:** `adminApi.ts` uses `NEXT_PUBLIC_API_URL || 'http://localhost:3001'` and `getAdminFetchOptions(session)` (Bearer token). Pending and approve/reject call the API on that base URL.
- **E) Dev-only debug:** `AdminAuthDebugPanel` on system-health page shows API base URL, JWT sub/email (client decode), and GET /admin/check result. Renders only when `NODE_ENV !== 'production'`.

---

## Patch list (file by file)

### 1. `apps/admin/lib/adminApi.ts`

**Change 1a — attach error code when fetch pending fails:**

- **Replaced:** After `(errorObj as any).message = message;` in the `!response.ok` block of `fetchPendingInstructors`, no `error` on errorObj.
- **Added:**  
  `(errorObj as any).error = typeof errorData?.error === 'string' ? errorData.error : undefined;`  
  before `throw errorObj;` in that same block.

**Change 1b — attach error code when approve fails:**

- **Replaced:** Same in the `!response.ok` block of `approveInstructor`.
- **Added:**  
  `(errorObj as any).error = typeof errorData?.error === 'string' ? errorData.error : undefined;`  
  before `throw errorObj;` in that same block.

### 2. `apps/admin/app/admin/instructor-approvals/page.tsx`

**Change 2a — error details state and load() clearing:**

- **Replaced:** Single `error` state and in `load` only `setError(null)`.
- **Added:** Type `ErrorDetails = { status?: number; error?: string; message: string }`, state `errorDetails`, and in `load` also `setErrorDetails(null)`. In the catch of `load`, set `errorDetails` from `e?.status`, `e?.error`, `e?.message`.

**Change 2b — handleApprove / handleReject:**

- **Replaced:** Only `setError(null)` and `setError(e?.message ?? '...')`.
- **Added:** `setErrorDetails(null)` at start; in catch set `errorDetails` with status, error, message.

**Change 2c — error banner:**

- **Replaced:** Single block `{error && ( <div>...</div> )}` with only the message text.
- **Added:** Same container with `role="alert"`, message div, then conditional block showing HTTP status and “Code: …” when `errorDetails` exists, then a **Retry** button that clears error/errorDetails and calls `load()`.

### 3. `apps/admin/components/admin/AdminAuthDebugPanel.tsx` (new file)

- **New:** Client component that:
  - Returns `null` when `NODE_ENV === 'production'`.
  - Uses `createClient` (Supabase) with `NEXT_PUBLIC_SUPABASE_*`, gets session, decodes JWT payload (base64url) for `sub` and `email`.
  - Fetches `GET ${API_BASE_URL}/admin/check` with `Authorization: Bearer ${session.access_token}`.
  - Renders a yellow “[DEV] Admin auth debug” panel with: API base URL, token sub, token email, GET /admin/check result (status and body summary or error message).

### 4. `apps/admin/app/admin/system-health/page.tsx`

- **Added:** Import `AdminAuthDebugPanel`, and below `SystemHealthPanel` render `<AdminAuthDebugPanel />`.

---

## Manual test checklist

1. **API on :3001**
   - Start API: `pnpm --filter @frostdesk/api dev` (or equivalent) and confirm it listens on 3001.

2. **Sidebar and navigation**
   - Open `http://127.0.0.1:3000/admin/human-inbox` (Next app on 3000).
   - Confirm a **single** sidebar (AdminSidebar) on the left with “Instructor approvals” visible.
   - Click **Instructor approvals** → page loads (no 404).

3. **Approvals page**
   - On Instructor approvals page, confirm the pending list loads (or “Nessun instructor in attesa” if empty).
   - If you have a pending instructor: click **Approva** → list updates (item removed).
   - If the API is down or returns an error: confirm the **error banner** shows message, HTTP status, error code (if present), and **Retry**; click Retry and see load run again.

4. **Admin check and dev panel**
   - Ensure your user is in `public.admin_users` for the DB used by the API (see `docs/ADMIN_403_DEBUG.md`).
   - Open `http://127.0.0.1:3000/admin/system-health`.
   - In **development**, at the bottom you should see “[DEV] Admin auth debug” with:
     - API base URL (e.g. `http://localhost:3001`)
     - Token sub and email
     - GET /admin/check result (e.g. HTTP 200, isAdmin: true).
   - In production build, that panel must not appear.

5. **Quick curl (optional)**  
   Prima verifica che l’API risponda: `curl -i http://127.0.0.1:3001/health` (200).  
   Poi, **uno comando per riga** (così `TOKEN` resta in ambiente):
   ```bash
   export TOKEN="$(TEST_EMAIL='bookwithfrostdesk@gmail.com' TEST_PASSWORD='frostdesk2025!' node scripts/supa_login.mjs | tr -d '\r\n')"
   ```
   ```bash
   node -e "const p=JSON.parse(Buffer.from(process.env.TOKEN.split('.')[1],'base64url').toString()); console.log({sub:p.sub,email:p.email});"
   ```
   ```bash
   curl -i "http://127.0.0.1:3001/admin/check" -H "Authorization: Bearer $TOKEN"
   ```
   ```bash
   curl -i "http://127.0.0.1:3001/admin/instructors/pending" -H "Authorization: Bearer $TOKEN"
   ```
   Se `/admin/check` è 403, inserisci il `sub` stampato in `public.admin_users` nel DB usato dall’API. Vedi `docs/ADMIN_403_DEBUG.md` per comandi completi (avvio API, export TOKEN, 403 → insert sub).

---

## Hard truth (reminder)

- All **admin API** endpoints live on the **API server (port 3001)**. The Next app is on 3000; calling `http://127.0.0.1:3000/admin/instructors/pending` returns 404 because that path is not a Next.js page route.
- **403 ADMIN_ONLY** on `/admin/check` means: token valid, but that `user_id` (JWT sub) is not in `public.admin_users` for the DB the API uses. Fix: insert that sub into `admin_users` on the correct DB, or fix `DATABASE_URL` / token.
