# Admin auth loop & "Invalid API key" – audit, root cause, fix

## TASK A: AUDIT (bullet list)

### Supabase env vars (file path + snippet)
- **packages/db/src/supabase_client.ts** – `process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL`; `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **apps/web/src/lib/supabase.ts** – `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **apps/admin/lib/getUserRole.ts** – `process.env.NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **apps/admin/lib/adminApi.ts** – `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for getSupabaseClient)
- **apps/admin/lib/requireAdmin.ts** – `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **apps/instructor/** (multiple) – `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **.env.example** – `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **apps/api** – env loaded via **apps/api/src/loadEnv.ts** (dotenv from cwd / ../.env / ../../.env); no direct Supabase vars; **auth_instructor.ts** uses **createDbClient()** from @frostdesk/db

### x-user-id / userId= in code (admin-relevant)
- **apps/api/src/lib/assertAdminAccess.ts** – `const userId = request?.headers?.['x-user-id'] || request?.query?.userId;` (legacy; no admin route imports it – report only, do not delete)
- **packages/db/src/human_inbox_service.ts** – comment only: `userId=debug-user`
- **apps/admin/lib/adminApi.ts** – comment only: "no x-user-id or userId query"

### API base URL defaults (admin/web)
- **apps/admin/lib/getUserRole.ts** – `'http://localhost:3000'` → fixed to **3001**
- **apps/admin/lib/requireAdmin.ts** – `'http://localhost:3000'` → fixed to **3001**
- **apps/admin/lib/adminApi.ts** – already `'http://localhost:3001'`
- **apps/web/src/lib/api.ts** – `'http://localhost:3000'` → fixed to **3001**

### Nested error parsing (error.code / errorData.error?.message)
- **apps/api/src/middleware/error_handler.ts** – reads `error.code` (thrown errors) and `payload.error.code` (legacy response); envelope is now flat in our API responses
- **apps/api/src/routes/instructor/** – several routes return `error: { code: ERROR_CODES.xxx }` (instructor surface; out of scope for admin contract)
- **apps/admin** – uses **parseAdminErrorBody** (flat `error` string + `message`); no nested assumption
- **apps/instructor/lib/instructorApi.ts**, **apps/human/lib/humanApi.ts** – `errorData.error?.message` (other apps; not admin)

### Where "Invalid API key" comes from
- **Not in repo.** It is returned by **Supabase’s API** when a request is made with an invalid or wrong-project API key (e.g. `createClient(url, key)` then `supabase.auth.getUser(token)`). So it occurs when the API’s Supabase client is built with a missing/wrong key (e.g. API process has no key, wrong key, or URL/key from different projects).

---

## TASK B: ROOT CAUSE (ranked)

1. **API process missing or wrong Supabase key** – API uses **createDbClient()** (auth_instructor → getUser). If `SUPABASE_ANON_KEY` (and siblings) are unset or wrong, client gets undefined/wrong key → Supabase returns "Invalid API key". **Most likely.**
2. **URL/key project mismatch** – `SUPABASE_URL` from project A and `SUPABASE_ANON_KEY` from project B (or vice versa) → same symptom.
3. **API using a key that doesn’t match the token issuer** – Token from project A (e.g. web with NEXT_PUBLIC_*), API validates with project B → "Invalid API key".
4. **Empty or whitespace-only env** – `.env` has `SUPABASE_ANON_KEY=` or spaces; treated as set but invalid → fixed by treating empty/whitespace as missing in **createDbClient**.
5. **Client calling wrong API base (3000 vs 3001)** – Causes wrong server or connection issues, not "Invalid API key"; fixed by aligning admin/web defaults to **3001**.

---

## TASK C: FIXES (minimal)

### C1) packages/db/src/supabase_client.ts
- Env resolution order already: URL = `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL`; KEY = `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Change:** Treat empty/whitespace as missing (`.trim()`; treat `''` as missing so error message lists which vars are required).

### C2) apps/api/src/lib/auth_instructor.ts
- **Change:** JSDoc on **getUserIdFromJwt** stating that it uses **createDbClient()** and thus the same Supabase project as the token issuer; set SUPABASE_URL + SUPABASE_ANON_KEY (or NEXT_PUBLIC_*) in API env to avoid "Invalid API key". No behavior change.

### C3) API base URL defaults
- **apps/admin/lib/getUserRole.ts** – default `'http://localhost:3000'` → `'http://localhost:3001'`.
- **apps/admin/lib/requireAdmin.ts** – default `'http://localhost:3000'` → `'http://localhost:3001'`.
- **apps/web/src/lib/api.ts** – default `'http://localhost:3000'` → `'http://localhost:3001'`.
- Env override (NEXT_PUBLIC_API_URL / VITE_API_URL) unchanged.

### C4) Contract
- No userId query or x-user-id reintroduced; flat error envelope kept.

---

## TASK D: VERIFICATION

1. **Build**
   ```bash
   pnpm -w run build
   ```

2. **Start API**
   ```bash
   pnpm --filter @frostdesk/api dev
   ```
   Ensure API process has the same Supabase project as the app (e.g. root `.env` or `apps/api/.env` with `SUPABASE_URL` and `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

3. **Health**
   ```bash
   curl -i http://127.0.0.1:3001/health
   ```

4. **Admin check (no auth → 401 UNAUTHENTICATED)**
   ```bash
   curl -i http://127.0.0.1:3001/admin/check
   ```
   Expect 401 and body with `"error":"UNAUTHENTICATED"` (and optional message e.g. missing Authorization).

5. **Obtain real token and call admin/check**
   From a workspace that has `@supabase/supabase-js` (e.g. apps/web), with `.env` at repo root containing the same Supabase URL and anon key:
   ```bash
   cd apps/web && node ../../scripts/supa_login.mjs YOUR_EMAIL YOUR_PASSWORD
   ```
   Then:
   ```bash
   curl -i http://127.0.0.1:3001/admin/check -H "Authorization: Bearer <TOKEN>"
   ```
   Or one-liner (replace EMAIL and PASSWORD):
   ```bash
   export T=$(cd apps/web && node ../../scripts/supa_login.mjs EMAIL PASSWORD); curl -i http://127.0.0.1:3001/admin/check -H "Authorization: Bearer $T"
   ```

6. **Confirm "Invalid API key" is gone**
   - With a valid token from the same Supabase project: expect **200** (admin) or **403** with `"error":"ADMIN_ONLY"` (non-admin), and no "Invalid API key" in the response.

---

## Full updated file contents (modified files only)

### packages/db/src/supabase_client.ts
```typescript
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server vs client env resolution:
 * - Server (e.g. apps/api): prefer SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.
 * - Client (e.g. apps/web, apps/admin): typically use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Resolution order below works in both; set the vars that exist in your context.
 */
export function createDbClient(): SupabaseClient {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey)
      missing.push(
        'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(', ')} are required`
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
```

### apps/api/src/lib/auth_instructor.ts
Only the JSDoc for `getUserIdFromJwt` was updated (second sentence added). Rest of file unchanged.

### apps/admin/lib/getUserRole.ts
Single line change: `'http://localhost:3000'` → `'http://localhost:3001'` for `API_BASE_URL`.

### apps/admin/lib/requireAdmin.ts
Single line change: `'http://localhost:3000'` → `'http://localhost:3001'` for `API_BASE_URL`.

### apps/web/src/lib/api.ts
Single line change: `'http://localhost:3000'` → `'http://localhost:3001'` for `API_BASE_URL`.

### scripts/supa_login.mjs
New file; see repo for full content. Usage: `cd apps/web && node ../../scripts/supa_login.mjs EMAIL PASSWORD` (prints access_token).
