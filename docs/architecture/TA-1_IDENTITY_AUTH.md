# TA-1 — Identity & Auth (Target Architecture)

**Status:** Target Architecture (design only)  
**Scope:** Identity establishment, authentication, and authorization patterns. No implementation changes; no migrations; no new providers or roles.

---

## 1. Scope and non-goals

### 1.1 In scope

- How identity is established (sign up, login).
- How the session is maintained and sent (access_token, refresh).
- How the API validates the caller (JWT validation, userId derivation).
- How authorization is enforced (admin vs non-admin routes).
- Token handling rules and failure responses.
- Security invariants that must hold for every request.

### 1.2 Out of scope (non-goals)

- Password policy, MFA, or OAuth provider configuration (Supabase Auth is the provider; document only).
- New auth providers or identity sources.
- New roles beyond what exists (e.g. admin, instructor as currently implemented).
- Implementation details beyond what is needed to explain and audit the flow.
- Migrations or schema changes.

---

## 2. Actors and trust boundaries

| Actor | Role | Trust boundary |
|-------|------|----------------|
| **Browser** | Hosts web/admin/instructor app. Holds Supabase session. Sends `Authorization: Bearer <access_token>` to API. | Untrusted: must not be assumed to send correct userId or role. |
| **API (Fastify)** | Validates JWT on every protected request. Derives userId only from validated JWT. Enforces admin via DB. | Trust boundary: only identity and role from JWT + DB are trusted. |
| **Supabase Auth** | Issues and validates JWTs. Source of identity (who the user is). | Trusted: `getUser(token)` is the authority for token validity and `user.id`. |
| **DB** | Source of truth for admin role (`profiles.is_admin` or equivalent). | Trusted: `isAdmin(userId)` is the authority for admin. |

**Trust rules:**

- The API never trusts `userId` (or role) from query params, headers (e.g. `x-user-id`), or body for authorization.
- The API trusts only: (1) identity from Supabase-validated JWT, (2) role from DB queries keyed by that identity.

---

## 3. Auth flows

### 3.1 Sign up

1. User submits sign-up (e.g. email/password) to Supabase Auth (via client SDK or hosted UI).
2. Supabase Auth creates the user and returns a session containing `access_token` (JWT) and `refresh_token`.
3. Client stores the session; subsequent API calls use `Authorization: Bearer <access_token>`.
4. No direct API involvement in sign-up; identity is created in Supabase.

### 3.2 Login

1. User submits credentials to Supabase Auth.
2. Supabase Auth validates and returns a session (`access_token`, `refresh_token`).
3. Client stores the session and sends `Authorization: Bearer <access_token>` on each request to the API.
4. API does not implement login; it only validates the token on each request.

### 3.3 Session refresh

1. When the access_token is expired (or near expiry), the client uses the `refresh_token` with Supabase Auth to obtain a new session.
2. New `access_token` is used in subsequent API requests.
3. API always receives only an access_token; it does not handle refresh. Invalid or expired token → 401.

### 3.4 Logout

1. Client clears the stored session (e.g. Supabase `signOut()`).
2. Subsequent requests are sent without a token (or with an invalid/revoked token).
3. API returns 401 for missing or invalid token.

---

## 4. Authorization flows

### 4.1 Admin routes (requireAdminUser)

- **Pattern:** Every `/admin/*` route must call a single helper that: (1) validates the JWT and derives `userId`, (2) checks `isAdmin(userId)` in the DB, (3) returns `userId` or throws.
- **Implementation concept:** `requireAdminUser(request)` → get token from `Authorization: Bearer …` → validate with `supabase.auth.getUser(token)` → `userId = user.id` → `isAdmin(userId)` → if not admin, throw; else return `userId`.
- **Rule:** No admin route may read `userId` from query or headers. All admin logic uses the `userId` returned by this helper.
- **Special case:** `GET /admin/check` returns `{ ok: true, isAdmin: boolean }` for the current token (same JWT validation + DB check) and does not perform an action; it is used by the frontend to gate UI only. Access control is still enforced on every other admin route.

### 4.2 Non-admin routes (requireSupabaseUser-style, concept only)

- **Pattern:** Routes that need a known user but not admin (e.g. instructor) validate the JWT and derive `userId` only. No role check beyond “authenticated”.
- **Concept:** A helper equivalent to “validate JWT, return userId” (e.g. `getUserIdFromJwt(request)`). Used for instructor or other non-admin protected routes.
- **Rule:** Same as admin: identity only from validated JWT; no trust of client-provided userId.

---

## 5. Token handling rules

### 5.1 How the token is sent

- **Header:** `Authorization: Bearer <access_token>`
- The `access_token` is the Supabase JWT obtained at login or after refresh.
- No other header or query param is used to convey identity for authorization (e.g. no `x-user-id`, no `?userId=`).

### 5.2 What is validated

- **On every protected request:** The API extracts the token from the `Authorization` header, then calls Supabase `getUser(token)` (or equivalent). From the validated result, `user.id` is the only source of `userId`.
- **On admin routes:** After obtaining `userId` from the JWT, the API calls `isAdmin(userId)` against the DB. Only if that returns true does the request proceed as admin.

### 5.3 What is never trusted

- `userId` (or any identifier) from query parameters.
- `userId` (or any identifier) from custom headers (e.g. `x-user-id`).
- `userId` or role from request body for authorization.
- Any client assertion of role (e.g. “I am admin”); role is determined only by DB.

---

## 6. Failure modes and responses

| Case | Behaviour | HTTP | Response shape (conceptual) |
|------|-----------|------|-----------------------------|
| Missing token | No `Authorization` or no Bearer token. Validation throws. | 401 | `ok: false`, `error.code: "UNAUTHENTICATED"` (or equivalent). |
| Invalid token | Token malformed or signature invalid. Supabase `getUser(token)` fails. | 401 | Same as above. |
| Expired token | Supabase rejects expired JWT. | 401 | Same as above. |
| Valid token, non-admin on admin route | `requireAdminUser` calls `isAdmin(userId)`; result false → throw. | 401 | Same as above (e.g. “Admin access required” / UNAUTHENTICATED). |
| Valid token, admin | Request proceeds with `userId` from JWT. | 200 (or appropriate success code) | Normal payload. |
| Valid token, non-admin on `/admin/check` | Not an error; endpoint returns `isAdmin: false`. | 200 | `ok: true`, `isAdmin: false`. |

**Invariant:** Missing, invalid, or expired token, or valid token but not admin on an admin-only route, always result in 401 (no 403 for “valid user, wrong role” in the current design; both are treated as unauthorized for the endpoint).

---

## 7. Security invariants (copy-ready)

- **Role-blind frontend:** The frontend never implements role logic. It sends the token and may show/hide UI based on `/admin/check`; actual access control is enforced only by the API.
- **Zero trust by default:** The API does not trust the client for identity or role. Every protected request validates the JWT and (for admin) the DB-backed role.
- **DB is source of truth for admin:** Admin status is determined solely by a DB check (e.g. `profiles.is_admin` or equivalent). Not from JWT claims, not from client, not from user_metadata.
- **No service role key for request auth:** Request authentication and authorization use the validated JWT and normal DB queries. The Supabase service role key is not used to authenticate incoming requests.
- **Single identity source per request:** The only accepted source of `userId` for authorization is the one derived from the validated JWT (`user.id` from Supabase `getUser(token)`).
- **No trust of query/header userId:** No admin or authenticated route may use `userId` from query parameters or custom headers for authorization or data scoping.
- **Admin perimeter sealed:** Every `/admin/*` route uses the same pattern: identity from JWT, then `isAdmin(userId)` from DB; no route reads client-provided userId.

---

## 8. Minimal examples (pseudocode)

### 8.1 Client: fetch with Authorization header

```
// Pseudocode: client sending a protected request
session = getSupabaseSession()   // from Supabase client (e.g. getSession())
accessToken = session.access_token

response = fetch(API_BASE_URL + "/admin/conversations", {
  method: "GET",
  headers: {
    "Authorization": "Bearer " + accessToken,
    "Content-Type": "application/json"
  }
})
// Do not send userId in query or headers.
```

### 8.2 Server: extracting userId from JWT (admin route)

```
// Pseudocode: server-side admin route
function handleAdminConversations(request, reply):
  token = request.headers["authorization"]?.replace("Bearer ", "")?.trim()
  if not token:
    return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED" } })

  user = supabase.auth.getUser(token)   // validate with Supabase
  if user.error or not user.data?.user:
    return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED" } })

  userId = user.data.user.id   // only source of userId

  isAdmin = db.isAdmin(userId)   // DB source of truth
  if not isAdmin:
    return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED" } })

  // use userId for data access; never use request.query.userId or request.headers["x-user-id"]
  data = getAdminConversations(userId, ...)
  return reply.send({ ok: true, data })
```

### 8.3 Server: single helper (requireAdminUser) used by all admin routes

```
// Pseudocode: requireAdminUser(request) → userId or throw
function requireAdminUser(request):
  userId = getUserIdFromJwt(request)   // validates Bearer token with Supabase, returns user.id or throws
  if not db.isAdmin(userId):
    throw InstructorAuthError("Admin access required")   // → 401
  return userId
```

---

## 9. References

- Current implementation: `apps/api/src/lib/auth_instructor.ts` (`getUserIdFromJwt`, `requireAdminUser`); admin routes in `apps/api/src/routes/admin.ts` and `apps/api/src/routes/admin/*`.
- [TA-2 — Authorization & Roles](../TA-2_AUTHORIZATION_AND_ROLES.md) for role source of truth and role model.
- [TA-1 Identity & Auth (flow doc)](../TA-1_IDENTITY_AND_AUTH.md) for the existing flow-oriented description.

---

## 10. Review checklist

Use this list to confirm the system remains aligned with TA-1. Answer yes/no per item.

1. **Bearer-only identity:** Does every protected API request derive identity only from the `Authorization: Bearer <access_token>` header (validated with Supabase)?
2. **No client userId for auth:** Are query params and custom headers (e.g. `x-user-id`, `?userId=`) never used for authorization or data scoping on admin or authenticated routes?
3. **Admin routes use single helper:** Do all `/admin/*` handlers obtain `userId` via a single JWT + DB pattern (e.g. `requireAdminUser(request)`), with no alternate path that reads userId from the client?
4. **DB is admin source of truth:** Is admin status determined only by a DB check (e.g. `isAdmin(userId)` / `profiles.is_admin`), not from JWT claims or client input?
5. **No service role for request auth:** Is the Supabase service role key (or equivalent) never used to authenticate or authorize incoming user requests?
6. **Frontend role-blind:** Does the frontend avoid implementing role logic (e.g. no “if admin then allow”) and rely only on sending the token and gating UI from `/admin/check` or similar API response?
7. **401 for auth failures:** Do missing token, invalid token, expired token, and valid-but-non-admin on admin routes all result in 401 (not 200 with a flag, except for `/admin/check` which returns 200 with `isAdmin: false`)?
8. **No new identity from body/query:** Is `userId` (or any identity) for authorization never read from request body or query on protected routes?
9. **Session from Supabase only:** Are sign-up, login, and session refresh handled only via Supabase Auth (client SDK or hosted UI), with the API receiving only a validated access_token?
10. **Admin perimeter complete:** Is there no remaining admin or authenticated route that still uses a “get userId from request header/query” helper instead of JWT validation?

---

## 11. Common failure patterns (how to spot them in PRs)

| Pattern | What goes wrong | How to spot in a PR |
|--------|------------------|----------------------|
| **Trust-by-parameter** | A new or changed route accepts `userId` (or similar) from query, header, or body and uses it for authorization or data access without validating the JWT first. | Grep for `request.query.userId`, `request.headers['x-user-id']`, or `getUserId(request)` (or equivalent) in route handlers. Any use outside a “validate JWT then use that userId” flow is a red flag. |
| **Role logic in frontend** | The client decides “is admin” or “can access X” from local state, storage, or decoded token instead of from an API response. | Look for conditionals that gate admin/instructor actions or routes based on stored role, token payload, or anything other than a call to `/admin/check` (or equivalent) and its response. |
| **Service role for user auth** | Backend uses the Supabase service role key (or similar) to authenticate or authorize a user request instead of validating the user’s JWT. | Grep for service-role usage in request-handling code (e.g. auth middleware, route handlers). Service role should not appear in the path that validates `Authorization: Bearer <token>`. |
| **New route skips requireAdminUser** | A new `/admin/*` (or other admin) route is added but uses a different way to get `userId` (e.g. custom helper or inline header/query read) or does not call the shared admin helper. | For every new route under `/admin/*`, confirm the handler’s first step is `requireAdminUser(request)` (or equivalent). Grep for new `getUserId` or similar in admin route files. |
| **Admin check bypass** | A route or middleware allows “admin” access based on something other than JWT + DB (e.g. IP, header, or env flag used in production). | Search for bypass logic: env vars like `ALLOW_DEBUG_USER`, special headers, or branches that skip `isAdmin(userId)` or JWT validation for certain callers. |
