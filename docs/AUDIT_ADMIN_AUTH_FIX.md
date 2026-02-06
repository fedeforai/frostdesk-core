# Admin auth & error-handling audit and fix

## 1) Audit report

| file_path | issue_type | exact snippet | required fix |
|-----------|------------|---------------|--------------|
| apps/admin/lib/adminApi.ts | x-user-id header | `'x-user-id': session.user.id` (multiple) | Remove; use only `Authorization: Bearer ${session.access_token}` |
| apps/admin/lib/adminApi.ts | userId in URL | `?userId=${session.user.id}` in URLs | Remove userId from all admin URLs; auth from Bearer only |
| apps/admin/lib/adminApi.ts | error shape | `errorData.error?.message` | Support API shape: `error` (string), `message` optional; use `errorData.error` (string) or `errorData.message` |
| apps/admin/lib/getUserRole.ts | userId in URL | `?userId=${session.user.id}` | Call `/admin/user-role` with Bearer only; no query param |
| apps/admin/lib/getUserRole.ts | no Bearer | No Authorization header | Add `Authorization: Bearer ${session.access_token}` |
| apps/api/src/lib/assertAdminAccess.ts | legacy client identity | `request?.headers?.['x-user-id'] \|\| request?.query?.userId` | **Legacy/unused** (no admin route imports it). Report only; do not delete. |
| apps/api/src/middleware/error_handler.ts | envelope shape | `ErrorEnvelope.error` as `{ code, message? }`; `normalized.error.code` | Use flat shape: `{ ok: false, error: string, message?: string }`; status from `ERROR_CODE_TO_STATUS[normalized.error]` |
| docs/* (various) | documentation | References to x-user-id / userId= | Update after code fixes (optional) |

## 2) Fix plan

- **API**
  - **error_handler.ts**: Change `ErrorEnvelope` to `error: string`; `normalizeErrorResponse` treat `error` as string or legacy `error.code`, output flat `{ ok: false, error, message? }`; use `normalized.error` (string) for status.
- **apps/admin**
  - **adminApi.ts**: Add `getAdminFetchOptions(session)` returning headers with `Authorization: Bearer session.access_token` only. Remove every `userId` from query and every `x-user-id` header. Parse errors as `error` (string) and `message` (optional).
  - **getUserRole.ts**: Call `/admin/user-role` with Bearer only; no `userId` in URL.
- **Legacy**
  - **assertAdminAccess.ts** (apps/api): Leave as-is; no admin route uses it; do not delete.

## 3) Verification

### Typecheck / build
```bash
pnpm -w run build
```
(Root build runs `@frostdesk/db` and `@frostdesk/api`; run Next/Vite builds separately if needed: `pnpm --filter @frostdesk/admin run build`, `pnpm --filter @frostdesk/web run build`.)

### API smoke (API must be running, e.g. `pnpm --filter @frostdesk/api dev` on port 3001)
```bash
# No auth → 401, body: { "ok": false, "error": "UNAUTHENTICATED" }
curl -i http://127.0.0.1:3001/admin/check

# Invalid or non-admin JWT → 403, body: { "ok": false, "error": "ADMIN_ONLY" }
curl -i http://127.0.0.1:3001/admin/check -H "Authorization: Bearer NON_ADMIN_JWT"

# Valid admin JWT → 200, body: { "ok": true, "isAdmin": true }
curl -i http://127.0.0.1:3001/admin/check -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
Health:
```bash
curl -i http://127.0.0.1:3001/health
```

### Dev commands (use package name from package.json)
- Vite (web): `pnpm --filter @frostdesk/web dev`
- Next (admin): `pnpm --filter @frostdesk/admin dev`
- API: `pnpm --filter @frostdesk/api dev` (or as in root `dev` script)
