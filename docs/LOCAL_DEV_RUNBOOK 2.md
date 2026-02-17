# Local dev runbook

## Dashboard non carica (http://localhost:3002/instructor/dashboard)

### Cosa controllare

1. **API in esecuzione su 3001** – La dashboard chiama l’API (conversazioni, KPI). Se l’API non è avviata, la pagina può restare bianca o mostrare errore.
   ```bash
   bash scripts/kill-port.sh 3001
   pnpm --filter @frostdesk/api dev
   ```
   In un **secondo terminale** avvia l’app instructor:
   ```bash
   pnpm --filter @frostdesk/instructor dev:3002
   ```
2. **Accesso** – Apri http://localhost:3002/instructor/login, fai login, poi vai su Dashboard. Se non sei approvato/onboarding non completato verrai reindirizzato (approval-pending, onboarding).
3. **Console del browser** – In caso di pagina bianca apri DevTools (F12) → Console e controlla eventuali errori JavaScript.

---

## API “Route not found” (e.g. PATCH /instructor/policies)

### Detect

- **Symptom:** UI shows “Route PATCH:/instructor/policies not found” or “Policies could not be loaded” even after code changes; API returns 404 for that path.
- **Cause:** An **old** API process is still running on port 3001. The new code (with the route) never bound because the port was already in use, so requests hit the old process.

### Fix

1. Free port 3001 and restart the API:
   ```bash
   bash scripts/kill-port.sh 3001
   pnpm --filter @frostdesk/api dev
   ```
2. In the API logs you should see: `Registering GET/PATCH /instructor/policies (policy document)`.
3. Reload the Rules & Policies page and click Retry.

---

## Port conflict (EADDRINUSE)

### Detect

- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3002` (or similar).
- **Cause:** Another process is already listening on that port (e.g. a previous dev server).

### Fix

1. **Kill the process on the affected port:**
   - **API (3001):** `bash scripts/kill-port.sh 3001`
   - **Instructor app (3002):** `bash scripts/kill-port.sh 3002`
   - Or with a custom port: `bash scripts/kill-port.sh 3012`

2. **Start instructor app (clears 3002 then starts):**
   ```bash
   pnpm run instructor:dev
   ```
   App runs at http://localhost:3002.

3. **Start on alternate port without killing:**
   ```bash
   pnpm run instructor:dev:alt
   ```
   App runs at http://localhost:3012.

### Verify

- **Instructor:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002` → 200 or 304.
- **API:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health` → 200.

## Verification checklist

- [ ] No process on 3002 before `instructor:dev`: `lsof -nP -iTCP:3002 -sTCP:LISTEN` returns nothing (or run `kill-port.sh 3002`).
- [ ] `pnpm run instructor:dev` starts without EADDRINUSE.
- [ ] Browser: http://localhost:3002 loads; login → Services: requests go to http://localhost:3001 only; no CORS errors in console.

---

## Auth trace: stop bounce to /instructor/login (AUTH_TRACE)

### Enable trace

Set `AUTH_TRACE=1` when starting the instructor app to log auth state in middleware and API proxy:

```bash
AUTH_TRACE=1 pnpm --filter @frostdesk/instructor dev
# or on port 3012:
AUTH_TRACE=1 pnpm --filter @frostdesk/instructor dev:3002
```

### Step-by-step test plan

1. **Start API and instructor**
   - Terminal 1: `pnpm --filter @frostdesk/api dev` (API on :3001).
   - Terminal 2: `AUTH_TRACE=1 pnpm --filter @frostdesk/instructor dev` (instructor on :3012 or default port).

2. **Health**
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/api/health` → 200 (or use your instructor port).
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health` → 200.

3. **Login once**
   - Open `http://localhost:3012/instructor/login` (or your port).
   - Log in with valid Supabase credentials.
   - After redirect, confirm you land on dashboard or next page (not back to login).

4. **Sidebar navigation**
   - Click sidebar links (e.g. Services, Profile, Dashboard).
   - In the terminal where instructor is running, check for `[auth-middleware]` and `[auth-proxy]` logs when AUTH_TRACE=1.
   - Expect: `hasSbAuthCookie: true`, `hasSession: true` on middleware; `hasSbAuthCookie: true` or `hasAuthHeader: true` and `hasSession: true` on API requests. If you see `hasSession: false` on protected routes, cookies are not reaching the server (same-site, domain, or path).

5. **Cookies on every request**
   - In DevTools → Application → Cookies → localhost, confirm `sb-*-auth-token` (and optional chunks) are present after login.
   - Reload a protected page; cookies should still be sent (SameSite=Lax and same origin).

6. **API with and without cookie**
   - Without cookie: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/api/instructor/services` → 401.
   - With cookie: copy `sb-...-auth-token` from browser cookies, then  
     `curl -s -o /dev/null -w "%{http_code}" -H "Cookie: sb-XXX-auth-token=YOUR_VALUE" http://localhost:3012/api/instructor/services` → 200 (if profile exists).

### What to fix from logs

- **Middleware shows `hasSbAuthCookie: false`** on protected routes: cookies not sent (check domain, path, Secure in production).
- **Middleware shows `hasSbAuthCookie: true` but `hasSession: false`**: Supabase `getSession()` failed (e.g. token expired, chunked cookie not reassembled); consider `getUser()` in middleware or refreshing session.
- **API shows `hasSbAuthCookie: true` but 401**: `getServerSession()` in route handler may be using a different cookie reader; ensure Route Handler runs in same context as middleware (cookies() in App Router should see the same cookies).
