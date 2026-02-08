# QA Phase 0 — Auth & Admin protocol (manual)

**Purpose:** Validate Supabase auth, access token usage, admin API protection, and web app admin guard.  
**Assumptions:** Local API on port **3001**, web app on port **5173**. No code changes; terminal and browser only.

**Prerequisites:** API and web app running; Supabase project configured; at least one admin user in DB (e.g. `profiles.is_admin = true` for that user).

---

## 1. Sanity check — API and web are up

### 1.1 API health

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health
```

**Expected:** `200`

**If not 200:** Start the API (e.g. `pnpm dev` in `apps/api` or monorepo root). Confirm port 3001 in logs (e.g. "listening on http://0.0.0.0:3001").

### 1.2 Web app reachable

Open in browser: `http://localhost:5173`

**Expected:** App loads (login page or home). No connection errors.

**If not:** Start the web app (e.g. `pnpm dev` in `apps/web`). Ensure `VITE_API_URL=http://localhost:3001` in `.env.local` so admin check calls the correct API.

---

## 2. Supabase signup

### 2.1 Open signup

1. Go to `http://localhost:5173`
2. Navigate to the sign-up page (link or route your app uses for registration).

### 2.2 Submit signup

1. Enter a **new** email and password (meet Supabase/auth rules if any).
2. Submit the form.

**Expected:**

- No error from Supabase (e.g. "Sign up successful" or redirect to login/home).
- If email confirmation is required: check email or Supabase dashboard for confirmation state.

**Failure branches:**

- **"Email already registered"** → Use another email or use login (step 3) for existing user.
- **Supabase/network error** → Check `.env` / Supabase URL and anon key; check network.
- **Redirect to login** → Normal; proceed to step 3 (login).

---

## 3. Supabase login

### 3.1 Open login

1. Go to `http://localhost:5173`
2. Open the login page.

### 3.2 Submit credentials

1. Enter email and password for an existing user (admin or non-admin).
2. Submit.

**Expected:**

- Success: session created; redirect to home or dashboard.
- No "Invalid login" or Supabase auth error.

**Failure branches:**

- **Invalid credentials** → Correct email/password or reset password; retry.
- **Session not created** → Check Supabase Auth settings and browser console for errors.

---

## 4. Access token retrieval

You need the Supabase **access_token** (JWT) for curl tests. Two options.

### 4.1 Browser (Application / Storage)

1. After login, open DevTools (F12).
2. **Application** tab → **Local Storage** (or **Session Storage**) → select origin `http://localhost:5173`.
3. Find the key used by Supabase (e.g. `sb-<project-ref>-auth-token` or similar).
4. Value is JSON; copy the `access_token` field (long JWT string).

**Expected:** A string starting with `eyJ...` (JWT).

**If not found:** Ensure you are logged in; check Supabase client config and storage key name in your app.

### 4.2 Browser console (programmatic)

1. After login, open DevTools → **Console**.
2. Run (adjust if your app exposes Supabase differently):

```javascript
const { data: { session } } = await window.__SUPABASE_CLIENT__?.auth.getSession() ?? { data: { session: null } };
console.log(session?.access_token ?? 'No session');
```

If your app does not expose the client globally, use the storage method (4.1) or a small test page that calls `supabase.auth.getSession()` and logs `session.access_token`.

**Expected:** Console prints the JWT or "No session". Copy the token for the next steps.

**Failure:** No session → confirm login completed and session is stored (step 3).

---

## 5. /admin/check with Bearer token

Use the token from step 4. Replace `YOUR_ACCESS_TOKEN` in the commands below.

### 5.1 No token (must fail with 401)

```bash
curl -i http://localhost:3001/admin/check
```

**Expected:**

- Status: `401`
- Body JSON: `{ "ok": false, "isAdmin": false, "error": { "code": "UNAUTHENTICATED" } }` (or equivalent).

**Failure:** If you get 200 or no 401, the endpoint may be trusting something other than the Bearer token; treat as fail.

### 5.2 Invalid token (must fail with 401)

```bash
curl -i -H "Authorization: Bearer invalid.token.here" http://localhost:3001/admin/check
```

**Expected:** Status `401`; body indicates unauthenticated.

### 5.3 Valid token — non-admin user

Use the access_token of a user who is **not** an admin (e.g. no row in `profiles` with `is_admin = true`, or `is_admin = false`).

```bash
curl -i -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3001/admin/check
```

**Expected:**

- Status: `200`
- Body: `{ "ok": true, "isAdmin": false }`

**Failure:** 401 with valid token → user may not exist in DB or token expired; refresh session and retry.

### 5.4 Valid token — admin user

Use the access_token of a user who **is** an admin (`profiles.is_admin = true` or equivalent).

```bash
curl -i -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" http://localhost:3001/admin/check
```

**Expected:**

- Status: `200`
- Body: `{ "ok": true, "isAdmin": true }`

**Failure:** 200 with `isAdmin: false` → DB role not set for that user; fix in DB and retry.

---

## 6. /admin/conversations — 200 only for admin

### 6.1 No token (must 401)

```bash
curl -i http://localhost:3001/admin/conversations
```

**Expected:** Status `401`. No conversation data.

### 6.2 Query param userId must be ignored (must 401)

Use a real admin user UUID; do **not** send any token.

```bash
curl -i "http://localhost:3001/admin/conversations?userId=REAL_ADMIN_UUID"
```

**Expected:** Status `401`. Backend must not trust `userId`; only Bearer token counts.

### 6.3 Valid non-admin token (must 401)

```bash
curl -i -H "Authorization: Bearer YOUR_NON_ADMIN_ACCESS_TOKEN" http://localhost:3001/admin/conversations
```

**Expected:** Status `401`. No conversation list.

### 6.4 Valid admin token (must 200)

```bash
curl -i -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" http://localhost:3001/admin/conversations
```

**Expected:**

- Status: `200`
- Body: JSON with `ok: true` and a `data` structure (e.g. `items`, `limit`, `offset`). Items may be empty.

**Failure:** 401 with valid admin token → check DB admin flag and token belongs to that user.

---

## 7. Web app /admin route guard behavior

The web app should protect `/admin` routes with a guard that calls the API with the session token and shows content only if the API says the user is admin.

### 7.1 Not logged in

1. Log out or use an incognito window.
2. Open `http://localhost:5173/admin` (or the exact admin path your app uses).

**Expected:**

- Redirect to login, or a "Forbidden" / "Access denied" / login prompt.
- No admin dashboard or admin data visible.

**Failure:** Admin UI visible when not logged in → guard or routing misconfigured.

### 7.2 Logged in as non-admin

1. Log in with a **non-admin** user.
2. Navigate to `http://localhost:5173/admin` (or your admin route).

**Expected:**

- "Forbidden", "Access denied", or redirect away from admin (e.g. home).
- No admin list or admin-only actions. No 403/401 in console from your app’s guard is acceptable if the guard shows "not allowed" and hides admin UI.

**Failure:** Full admin UI or data when user is non-admin → guard not using API result correctly; or API returning admin for non-admin (re-check step 5.3 and 6.3).

### 7.3 Logged in as admin

1. Log in with an **admin** user.
2. Navigate to `http://localhost:5173/admin`.

**Expected:**

- Admin UI loads (e.g. sidebar, dashboard, or conversation list).
- No "Forbidden" or "Access denied" for admin.
- If the app loads a list (e.g. conversations), it should match what `curl` with admin token returns (step 6.4).

**Failure:** Admin sees "Forbidden" or no data → check `VITE_API_URL` points to `http://localhost:3001`; check `checkAdminStatus(session.access_token)` is used and that session has a valid token; check network tab for 401 on `/admin/check` or `/admin/conversations`.

### 7.4 Token removed mid-session (optional)

1. Log in as admin and open admin page.
2. In DevTools → Application → Local Storage (or Session Storage), remove or corrupt the Supabase auth key.
3. Reload or navigate again to `/admin`.

**Expected:** Guard treats as unauthenticated: redirect to login or "Access denied". No crash.

---

## 8. Summary checklist

| Step | What | Expected |
|------|------|----------|
| 1.1 | API health | 200 |
| 1.2 | Web app | Loads on 5173 |
| 2 | Signup | Success or redirect to login |
| 3 | Login | Session created |
| 4 | Token retrieval | JWT copied from storage or console |
| 5.1 | /admin/check no token | 401 |
| 5.2 | /admin/check invalid token | 401 |
| 5.3 | /admin/check valid non-admin | 200, isAdmin: false |
| 5.4 | /admin/check valid admin | 200, isAdmin: true |
| 6.1 | /admin/conversations no token | 401 |
| 6.2 | /admin/conversations ?userId= only | 401 |
| 6.3 | /admin/conversations non-admin token | 401 |
| 6.4 | /admin/conversations admin token | 200, data |
| 7.1 | Web /admin not logged in | No admin UI; login or denied |
| 7.2 | Web /admin non-admin | Forbidden / no admin UI |
| 7.3 | Web /admin admin | Admin UI and data |

**Sign-off:** All rows pass → Phase 0 auth and admin QA passed. Any row fails → fix and re-run before sign-off.
