# TA-2 — Admin Audit Logging (Target Architecture)

**Status:** Target Architecture (design only)  
**Scope:** Making admin actions observable and defensible. No behavior change to existing admin flows; no migrations in this document.

---

## 1. Purpose and non-goals

### 1.1 Purpose

- **Observability:** Record which admin performed which action, on which resource, and with what outcome, so operations and support can reason about admin activity.
- **Defensibility:** Provide a minimal, non-repudiable trail (who, what, when, outcome) for compliance and incident review, without storing sensitive payloads.
- **Alignment with auth:** Use the same identity as authorization—the `userId` produced by `requireAdminUser(request)`—so the audit actor is the authenticated admin only.

### 1.2 Non-goals

- Full request/response logging (no bodies, no tokens, no PII dumps).
- Real-time alerting or SIEM integration (design only; integration is out of scope here).
- Auditing of non-admin routes (instructor, public, etc.).
- Changing or blocking admin behavior based on audit; audit is best-effort and must not affect the main request outcome.
- Schema or migration design (this doc does not propose table definitions or DDL).

---

## 2. What gets logged (minimum fields)

Each admin action log entry should include at least:

| Field | Description | Example / notes |
|-------|--------------|------------------|
| **timestamp** | When the action completed (or when the handler finished). | ISO 8601 or epoch ms. |
| **actor_user_id** | The authenticated admin who performed the action. | From `requireAdminUser(request)` only; never from client. |
| **route** | API path (pattern or normalized). | e.g. `GET /admin/conversations`, `POST /admin/bookings/:id/override-status`. |
| **method** | HTTP method. | `GET`, `POST`, etc. |
| **target identifiers** | Resource IDs when present in the request (path/query/body). | e.g. `conversationId`, `bookingId`, `instructorId`; only IDs, no payloads. |
| **outcome** | Whether the handler completed successfully from the API’s perspective. | `success` or `failure`. |
| **error_code** | Normalized error code when outcome is failure. | e.g. `UNAUTHENTICATED`, `NOT_FOUND`, `INVALID_PAYLOAD`; empty or omitted when success. |

**Rules:**

- Target identifiers are optional and only when they are part of the route contract (path param, required query, or single target in body). Do not log arbitrary query params or full body.
- No expansion of IDs into PII (e.g. no “user email” or “conversation content” in the audit log).

---

## 3. What must never be logged

- **Tokens and secrets:** No `Authorization` header value, no access_token, no refresh_token, no API keys.
- **Message or conversation content:** No message bodies, no full conversation text, no PII dumps.
- **Passwords or credentials:** No password, no credential fields from sign-up/login.
- **Unbounded or sensitive request payloads:** No raw request body, no file contents, no free-text that could contain PII.
- **Client-provided identity:** No `x-user-id` or `?userId=`; the only identity in the log is the one derived from the validated JWT (`actor_user_id`).

If in doubt, log only the minimum fields in section 2 and resource IDs; do not log payloads or headers.

---

## 4. Where logging happens (conceptual)

### 4.1 When the actor is known

- Logging is performed **after** `requireAdminUser(request)` has succeeded, so that:
  - The actor is always the authenticated admin (`actor_user_id` from that helper).
  - Requests that fail auth (no token, invalid token, non-admin) are not attributed to an admin; they may be logged as failed-auth events elsewhere if needed, but are out of scope for “admin action” audit.

### 4.2 When the outcome is known

- The audit record is written **after** the handler has executed and the response is determined:
  - **Success:** outcome = success; error_code empty or omitted.
  - **Failure:** outcome = failure; error_code = normalized code (e.g. from `normalizeError` or equivalent).
- This ensures the log reflects what actually happened (e.g. 404, 400, 401) rather than only “request received.”

### 4.3 Placement in the request lifecycle

Conceptually:

1. Request arrives at an admin route.
2. `requireAdminUser(request)` runs; if it throws, return 401 (no admin audit entry for this request).
3. Handler runs (e.g. fetch data, update booking).
4. Response and outcome (success/failure, error code) are determined.
5. **Then** write the audit entry (timestamp, actor_user_id, route, method, target identifiers, outcome, error_code). No sensitive payloads.
6. Return the response to the client.

Audit write is a side effect after the business outcome is fixed; it does not influence status code or response body.

---

## 5. Failure handling

- **Audit failure must not block the main request.** If writing the audit record fails (e.g. log sink unavailable, write timeout), the API must still return the same response to the client as it would if audit had succeeded.
- **Best-effort:** Audit is best-effort. Retries, buffering, or async writes are acceptable design choices to improve reliability, but the contract is: admin action response is independent of audit success.
- **Operational visibility:** Audit write failures should be visible to operators (e.g. metrics or non-audit logs) so that missing audit data can be detected and addressed. How to expose this is out of scope for this design doc.

---

## 6. Sampling rules

- **Default: no sampling for admin.** Every successful admin action (after `requireAdminUser` and handler execution) should produce one audit entry. There is no default sampling rate that drops a percentage of admin actions.
- **Optional future:** If sampling is ever introduced (e.g. for high-volume read-only endpoints), it must be documented and explicit; it is not part of the baseline design. This document assumes full coverage of admin actions.

---

## 7. Acceptance criteria (pass/fail)

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | **Actor from auth only** | Every audit entry’s `actor_user_id` comes only from `requireAdminUser(request)` (or equivalent). | Any use of client-provided userId/header/query for `actor_user_id`. |
| 2 | **Minimum fields present** | Each entry has timestamp, actor_user_id, route, method, outcome; target identifiers when applicable; error_code when outcome is failure. | Missing required fields or wrong semantics (e.g. outcome success but error_code set). |
| 3 | **No sensitive data** | No tokens, no message/conversation bodies, no PII dumps, no raw Authorization header. | Any token, full message body, or PII in audit payload. |
| 4 | **Audit never blocks request** | Response to the client is unchanged whether audit write succeeds or fails. | Admin request fails or changes (e.g. 500) because audit write failed. |
| 5 | **Outcome matches response** | outcome and error_code reflect the actual handler result (e.g. 404 → failure + NOT_FOUND). | Logged outcome/error_code inconsistent with HTTP status or normalized error. |
| 6 | **No sampling by default** | All admin actions that pass auth and execute the handler are audited. | Sampling that drops admin actions without explicit design. |

---

## 8. References

- [TA-1 — Identity & Auth](TA-1_IDENTITY_AUTH.md): `requireAdminUser(request)` and zero-trust admin identity.
- [TA-5 — Admin Operations](../TA-5_ADMIN_OPERATIONS.md): Admin route surface and semantics (if present).
- Implementation (for alignment only): `apps/api/src/lib/auth_instructor.ts` (`requireAdminUser`); `apps/api/src/routes/admin.ts` and `apps/api/src/routes/admin/*`.
