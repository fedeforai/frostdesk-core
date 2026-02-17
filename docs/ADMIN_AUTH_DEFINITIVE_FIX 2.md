# Admin auth + error envelope + "Invalid API key" – definitive fix

## A) AUDIT (repo-wide)

| File path | Exact snippet | Why it violates / note |
|-----------|----------------|-------------------------|
| **apps/api/src/lib/assertAdminAccess.ts** | `const userId = request?.headers?.['x-user-id'] \|\| request?.query?.userId;` | Identity from client; contract requires identity only from Bearer. **Legacy, unused by admin routes; do not delete.** |
| **apps/admin/lib/adminApi.ts** | Comment: "no x-user-id or userId query" | Compliant (comment only). |
| **packages/db/src/human_inbox_service.ts** | Comment: `userId=debug-user` | Comment only; no violation. |
| **apps/admin** (requireAdmin, getUserRole, adminApi) | All use Bearer only; no `userId=` in admin URLs | Compliant. |
| **apps/api** (admin routes) | All call `requireAdminUser(request)` | Compliant. |
| **apps/api/src/middleware/error_handler.ts** | Uses `error.code` and `payload.error` (string or legacy `{ code }`); outputs flat envelope | Compliant; normalizes legacy. |
| **apps/api** (createDbClient usage) | **auth_instructor.ts** and **db.ts** use `createDbClient()`; env loaded in **index.ts** via **loadEnv.ts** | loadEnv previously tried multiple paths and did not fail if none found; now fixed (deterministic, throw if no file). |

No remaining: `/admin/check?userId`, admin fetch without Authorization, or admin clients parsing `error: { code }` (admin uses flat `error` string).

---

## B) FIXES APPLIED

### B1) apps/api/src/loadEnv.ts
- **Deterministic load:** First existing file among candidates (cwd/.env, cwd/../.env, path relative to file → repo root).
- **Throw if none found:** `throw new Error('No .env file found. Tried: ...')`.
- **Helper:** `getLoadedEnvPath(): string | null`.

### B2) packages/db/src/supabase_client.ts
- Already has: URL = `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL`, KEY = `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`, trim, empty treated as missing, error message listing missing vars. **No change in this patch.**

### B3) apps/api/src/lib/auth_instructor.ts
- When Supabase `getUser(token)` returns an error whose message matches `/invalid\s*api\s*key/i`, throw an error with `code: 'INTERNAL_ERROR'` and message `"Server misconfigured"` (no leak of details).

### B4) All /admin routes
- Confirmed: every admin route (admin.ts and nested routers) calls `requireAdminUser(request)` at the top. **No change.**

### B5) error_handler.ts
- Confirmed: outputs flat `{ ok: false, error: string, message?: string }`; normalizes legacy `{ error: { code } }`. **No change.**

### C) TESTS
- **apps/api:** Added `"test": "vitest run"` and devDependency `vitest`.
- **vitest.config.ts:** Include only `src/routes/admin/**/*.test.ts` and `src/routes/__tests__/admin_check.test.ts`; setupFiles: `src/vitest.setup.ts`.
- **src/vitest.setup.ts:** Set dummy `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` so modules load.
- **src/routes/__tests__/admin_check.test.ts:**
  1. GET /admin/check without Authorization → 401, `body.error === "UNAUTHENTICATED"` (string).
  2. GET /admin/check with Bearer but mocked non-admin → 403, `body.error === "ADMIN_ONLY"` (string).
  3. Assert `body.error` is never an object.

---

## D) FULL UPDATED FILE CONTENTS (modified files only)

### apps/api/src/loadEnv.ts
```typescript
/**
 * Load .env before any other app code so process.env is set for @frostdesk/db etc.
 * Deterministic: loads the first existing file among candidates; throws if none found.
 * Candidates (in order): cwd/.env, cwd/../.env, path relative to this file (repo root or apps/api).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let loadedEnvPath: string | null = null;
for (const envPath of candidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    break;
  }
}

if (!loadedEnvPath) {
  throw new Error(
    `No .env file found. Tried (first existing wins): ${candidates.join(', ')}`
  );
}

/** Returns the path of the .env file that was loaded, or null if none. */
export function getLoadedEnvPath(): string | null {
  return loadedEnvPath;
}
```

### apps/api/src/index.ts
- Added: `import { getLoadedEnvPath } from './loadEnv.js';`
- Removed: `import 'dotenv/config';`
- After listen, in dev (`NODE_ENV !== 'production'`): log `loadedEnvPath`, `SUPABASE_URL present?`, `SUPABASE_ANON_KEY present?` (no key value).

### apps/api/src/lib/auth_instructor.ts
- In `getUserIdFromJwt`, after `if (error)`: if `error.message` matches `/invalid\s*api\s*key/i`, throw `Error` with `(e as any).code = 'INTERNAL_ERROR'` and `message: 'Server misconfigured'`; else throw `InstructorAuthError` as before.

### apps/api/package.json
- scripts: added `"test": "vitest run"`.
- devDependencies: added `"vitest": "^2.1.0"`.

### apps/api/vitest.config.ts (new)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/routes/admin/**/*.test.ts', 'src/routes/__tests__/admin_check.test.ts'],
    setupFiles: ['src/vitest.setup.ts'],
    environment: 'node',
  },
});
```

### apps/api/src/vitest.setup.ts (new)
Sets dummy `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` if unset so test modules can load.

### apps/api/src/routes/__tests__/admin_check.test.ts (new)
Three tests as above; mocks `requireAdminUser` for 401/403 cases and asserts flat string `body.error`.

---

## E) VERIFICATION COMMANDS

```bash
# 1. Build
pnpm -w run build

# 2. API dev (ensure .env exists at repo root or apps/api so loadEnv finds it)
pnpm --filter @frostdesk/api dev
# In dev, console should show: loadedEnvPath, SUPABASE_URL present?, SUPABASE_ANON_KEY present?

# 3. Health
curl -i http://127.0.0.1:3001/health

# 4. Admin check – no auth (expect 401, body.error === "UNAUTHENTICATED")
curl -i http://127.0.0.1:3001/admin/check

# 5. Admin check – with real token (expect 200 or 403 ADMIN_ONLY; must NOT return "Invalid API key")
curl -i http://127.0.0.1:3001/admin/check -H "Authorization: Bearer <REAL_ACCESS_TOKEN>"

# 6. API tests
pnpm --filter @frostdesk/api test
```
