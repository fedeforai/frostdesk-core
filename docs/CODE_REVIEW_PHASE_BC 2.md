# Phase B/C Code Review — Audit, request_id, AI Draft Guardrails + Telemetry

Focused review only. No refactors, no behavior changes to endpoints.

**Applied:** H1, H2, M1 patches have been applied in code. L1/L2 remain optional.

---

## A) Findings (by severity)

### Blocker
- None.

### High

**H1. PII in audit payload (phone_number)**  
- **File:** `apps/api/src/routes/admin/instructor_whatsapp.ts`  
- **Code:** Audit event includes `payload: { phone_number: account.phone_number, status: account.status }`.  
- **Requirement:** No phone numbers in audit payload.  
- **Patch:** Remove `phone_number` from payload; keep only non-PII fields (e.g. `status`, or a non-identifying identifier).  

```ts
// Before
payload: { phone_number: account.phone_number, status: account.status },

// After (example: status only; add instructor_id if needed for correlation, not PII)
payload: { status: account.status },
```

---

**H2. GET /admin/audit — invalid limit can become NaN**  
- **File:** `apps/api/src/routes/admin.ts`  
- **Code:** `const limitRaw = query.limit != null ? Number(query.limit) : 20;` then `const limit = Math.min(Math.max(1, limitRaw), 100);`. If `query.limit` is e.g. `"x"`, `limitRaw` is NaN, so `limit` is NaN; `listAuditLog({ limit: NaN })` yields `safeLimit = NaN` and SQL `LIMIT NaN` can error or misbehave.  
- **Patch:** Coerce invalid numbers to default before clamp.  

```ts
const limitRaw = query.limit != null ? Number(query.limit) : 20;
const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
```

---

### Medium

**M1. admin_override_booking_status payload.reason may contain free text**  
- **File:** `apps/api/src/routes/admin.ts`  
- **Code:** `payload: { new_status: result.status, reason: body.reason ?? undefined }`. `body.reason` is free text and could contain PII if an admin pastes customer details.  
- **Patch (minimal):** Either omit `reason` from audit payload, or truncate and document as admin-only (e.g. max 200 chars, no logging of obvious PII).  

```ts
// Option A: omit reason from payload
payload: { new_status: result.status },

// Option B: truncate only
payload: {
  new_status: result.status,
  reason: typeof body.reason === 'string' ? body.reason.slice(0, 200) : undefined,
},
```

---

### Low

**L1. request.id not on Fastify typings**  
- **Files:** Multiple (e.g. `send_ai_draft.ts`, `webhook_whatsapp.ts`, `admin.ts`, `instructor_whatsapp.ts`)  
- **Code:** `(request as any).id` used to pass request_id.  
- **Note:** Runtime behavior is correct (middleware sets `request.id`). Typings are incomplete.  
- **Patch (optional):** Add a declaration file that extends `FastifyRequest` with `id?: string` so callers can use `request.id` without `as any`. No runtime or endpoint change.  

---

**L2. Cursor pagination index**  
- **File:** `packages/db/migrations/014_audit_log.sql`  
- **Code:** Index is `(created_at DESC)` only. `listAuditLog` uses `(created_at, id) < (cursor_ts, cursor_id)` and `ORDER BY created_at DESC, id DESC`.  
- **Note:** Current index helps ORDER BY; a composite `(created_at DESC, id DESC)` would better support the cursor predicate. Optional performance improvement, not required for correctness.  
- **Patch (optional):** Add composite index in a follow-up migration if needed:  
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_id_desc ON audit_log (created_at DESC, id DESC);`  
  and drop the single-column `idx_audit_log_created_at_desc` if replacing it.  

---

## B) Verification summary (no issues found)

- **audit_log schema:** Append-only (only INSERT in code). Indexes: entity_type+entity_id, actor_id, created_at DESC — match listAuditLog filters and ordering. Rollback (014_audit_log_down.sql): indexes dropped before table — correct.  
- **db repository:** `insertAuditEvent` columns match table (no id/created_at in INSERT). `listAuditLog`: cursor (created_at, id) DESC stable; limit clamped 1..100; invalid cursor falls back to latest.  
- **request_id middleware:** Always sets `request.id` (incoming trimmed or UUID). Does not alter response or break lifecycle.  
- **API hooks:** Audit calls wrapped in try/catch; webhook/send_ai_draft/admin override capture request_id/ip/user_agent. GET /admin/audit: admin-only, cursor-based, newest first, no joins.  
- **AI draft telemetry:** `ai_draft_generated` has draft_id, model, confidence_intent, was_truncated, violations_count. `ai_draft_skipped` once per attempt when no draft, reason in allowed set. No message text in payloads. Guardrails: max 2 sentences is warning; blocking rules still set safeDraftText to null. Fail-open kept.  

---

## C) Minimal patch suggestions (copy-paste)

**H1 — Remove phone_number from instructor_whatsapp audit**

```ts
// apps/api/src/routes/admin/instructor_whatsapp.ts
payload: { status: account.status },
```

**H2 — Sanitize GET /admin/audit limit**

```ts
// apps/api/src/routes/admin.ts (GET /admin/audit handler)
const limitRaw = query.limit != null ? Number(query.limit) : 20;
const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
```

**M1 — Reduce PII risk for admin override (option A)**

```ts
// apps/api/src/routes/admin.ts (admin_override_booking_status)
payload: { new_status: result.status },
```

---

## D) Quick regression checklist (8 commands)

Run locally to confirm no runtime break:

1. **Workspace build**  
   `pnpm -w run build`  
   Expect: exit 0 (or only pre-existing failures in other packages).

2. **DB package build**  
   `pnpm --filter @frostdesk/db run build`  
   Expect: exit 0.

3. **API package build**  
   `pnpm --filter api run build`  
   Expect: exit 0.

4. **Dev server**  
   `pnpm -w dev`  
   Expect: API and DB start; no new errors from Phase B/C code.

5. **Health**  
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/health`  
   Expect: 200 (replace PORT with your API port).

6. **Admin audit route (unauthenticated)**  
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/admin/audit`  
   Expect: 401.

7. **Admin audit with auth (if you have a token)**  
   `curl -s -H "Authorization: Bearer YOUR_JWT" "http://localhost:PORT/admin/audit?limit=5"`  
   Expect: 200 and JSON with `ok: true`, `data.items`, `data.next_cursor`, `data.limit`.

8. **Webhook (smoke)**  
   Send a minimal valid WhatsApp webhook POST to your webhook URL; then check audit_log for one `inbound_message_received` and optional `ai_draft_generated` or `ai_draft_skipped`. No new application errors.

---

Constraints respected: no refactors, no endpoint behavior changes, no TS config changes.
