# Implementation tickets: Admin Audit Logging

**Source:** [TA-2 — Admin Audit Logging](architecture/TA-2_ADMIN_AUDIT_LOGGING.md) (design only).  
**Principle:** Append-only audit events; no DB schema decided in this doc. Small, independent tickets; no refactors; no behavior change to admin flows.

Tickets are ordered: later tickets depend on earlier ones. Each ticket is self-contained with owner, scope, tasks, guardrails, acceptance, and rollback notes.

---

## T1 — Define audit event shape and types

| Field | Value |
|-------|--------|
| **Owner** | Backend |
| **Scope** | Types/interfaces for a single admin audit event. No persistence, no route changes. |

**Tasks**

1. Define an audit event type (TypeScript interface or type) with the minimum fields from TA-2 §2: `timestamp`, `actor_user_id`, `route`, `method`, `target_identifiers` (optional, e.g. `Record<string, string>` for IDs only), `outcome` (`success` \| `failure`), `error_code` (optional, present when outcome is failure).
2. Document which target identifier keys are allowed (e.g. `conversationId`, `bookingId`, `instructorId`) and that they must be resource IDs only—no payloads or PII.
3. Place the type in a dedicated module (e.g. `apps/api/src/audit/` or similar) so it can be imported by the writer and by route instrumentation.

**Guardrails**

- Do not add fields that could hold tokens, message bodies, or PII. Only TA-2 §2 and §3 apply.
- No persistence logic in this ticket.

**Acceptance**

- Event type exists and is exported.
- All minimum fields from TA-2 §2 are present; no sensitive fields.
- No change to any admin route or response.

**Rollback**

- Remove the new type and module. No other code depends on it until T2.

---

## T2 — Audit writer module (best-effort, non-blocking)

| Field | Value |
|-------|--------|
| **Owner** | Backend |
| **Scope** | A single writer function/module that accepts an audit event and passes it to a sink. Must never throw to the caller; audit failure must not affect the response. |

**Tasks**

1. Implement a writer (e.g. `writeAuditEvent(event)` or equivalent) that accepts the event type from T1 and delegates to an injectable sink (interface or function type).
2. Wrap the sink call in try/catch (or equivalent). On success, return normally. On failure, log the failure for operator visibility (e.g. error log or metric) and return without throwing. The caller must never receive an exception from the writer.
3. Document the contract: "Audit write is best-effort; caller response is independent of audit success."
4. Do not implement the sink in this ticket (stub or no-op is acceptable so that routes can call the writer once T4/T5 run).

**Guardrails**

- Audit writer must never throw. Any throw from the sink must be caught and turned into a log + silent return.
- Do not change request/response behavior. No new status codes or body changes.

**Acceptance**

- Caller can call the writer with an event; caller’s control flow and return value are unchanged whether the sink succeeds or fails.
- If the sink throws, the writer catches, logs, and does not rethrow.
- TA-2 §5 (failure handling) satisfied.

**Rollback**

- Remove the writer module and any stub sink. No route instrumentation yet (T4/T5), so no route code to revert.

---

## T3 — Append-only sink implementation

| Field | Value |
|-------|--------|
| **Owner** | Backend |
| **Scope** | One concrete implementation of the audit sink: append a single event to persistent storage. Schema and migration are out of scope (defined elsewhere); this ticket implements the sink that performs one append. |

**Tasks**

1. Implement the sink interface/contract used by the writer from T2 (e.g. a function that receives an audit event and persists it).
2. Persistence is append-only: one write per event, no updates or deletes. Storage mechanism and schema (table name, columns) are decided in a separate migration/schema ticket; this ticket implements the sink that performs the append (e.g. insert one row) once the schema exists.
3. If schema does not exist yet: implement a no-op or in-memory sink so that T2 and T4/T5 can run; replace with real persistence when the migration is available. Alternatively, this ticket can be done after the migration ticket and then implement the real insert.
4. Sink must not throw for transient reasons into the writer without the writer catching (writer contract from T2). Prefer: sink throws only on programming errors; operational failures (e.g. DB unavailable) are caught inside the sink and surfaced as a return/false so the writer can log and continue. Or sink may throw and writer catches (T2). Clarify in implementation: writer must never propagate to route handler.

**Guardrails**

- Append-only. No update or delete of audit records.
- No sensitive data in the persisted payload (event shape from T1 only).
- Schema/migration is not defined in this ticket; align with a separate schema/migration task.

**Acceptance**

- Writer (T2) can use this sink to persist events.
- One event in → one append out. No sampling; no dropping of events by the sink.
- Audit failure (sink failure) does not change the admin response (writer contract).

**Rollback**

- Remove sink implementation; revert writer to stub/no-op sink. No route code depends on sink success.

---

## T4 — Instrument one admin route (pilot)

| Field | Value |
|-------|--------|
| **Owner** | Backend |
| **Scope** | Add audit logging to a single admin route as a pilot. Response behavior unchanged. |

**Tasks**

1. Choose one admin route (e.g. `GET /admin/conversations` or `POST /admin/bookings/:id/override-status`) that already uses `requireAdminUser(request)`.
2. After the handler has run and the response (and outcome) is known: build an audit event (timestamp, actor_user_id from the same userId returned by requireAdminUser, route, method, target identifiers if any, outcome success/failure, error_code if failure). Use the normalized error from existing catch logic for error_code.
3. Call the audit writer from T2 with this event. Do not await in a way that can change the response; ensure any audit failure is already handled inside the writer (no throw). Then return the existing response to the client.
4. Do not log any part of the request body, Authorization header, or message content. Only IDs and TA-2 §2 fields.

**Guardrails**

- Audit runs after outcome is known; actor comes only from `requireAdminUser(request)`.
- If the route does not call requireAdminUser (e.g. /admin/check), do not use it for this pilot; pick a route that does.
- Audit must never block or change the response (TA-2 §4, §5).

**Acceptance**

- One admin route produces one audit entry per request (after auth and handler run).
- Response status and body are unchanged whether audit succeeds or fails.
- TA-2 acceptance criteria 1–5 hold for this route (actor from auth only; minimum fields; no sensitive data; audit never blocks; outcome matches response).

**Rollback**

- Remove the audit build + writer call from the pilot route. Restore the route to its pre-T4 state. No other routes depend on this.

---

## T5 — Instrument all remaining admin routes

| Field | Value |
|-------|--------|
| **Owner** | Backend |
| **Scope** | Apply the same audit pattern as T4 to every other admin route that uses `requireAdminUser(request)`. No behavior change. |

**Tasks**

1. List all admin routes (main `admin.ts` and `admin/*` submodules) that call `requireAdminUser(request)` and are not yet instrumented (i.e. exclude the pilot from T4).
2. For each route: after handler execution and outcome known, build the audit event (timestamp, actor_user_id, route, method, target identifiers when applicable, outcome, error_code when failure) and call the audit writer. Use the same pattern as T4: no await that can change response; writer never throws.
3. For routes with path/query/body target IDs (e.g. bookingId, conversationId), include only those IDs in target_identifiers; no payloads or PII.
4. Ensure no sampling: every admin action that passes auth and runs the handler produces one audit call.

**Guardrails**

- Same as T4: actor from requireAdminUser only; no sensitive data; audit never blocks; outcome matches response.
- No refactor of route logic. Only add the audit build + write call after the existing handler and response are determined.
- Do not add new routes or change URL/response shapes.

**Acceptance**

- Every admin route that uses requireAdminUser and executes the handler emits one audit event per request.
- All TA-2 §7 acceptance criteria hold (actor from auth only; minimum fields; no sensitive data; audit never blocks; outcome matches response; no sampling).
- Existing admin behavior and responses are unchanged.

**Rollback**

- Remove audit build + writer call from each instrumented route. Revert to pre-T5 state per route. Can be done route-by-route if needed.

---

## T6 — Verification and documentation

| Field | Value |
|-------|--------|
| **Owner** | Backend / QA |
| **Scope** | Verify audit behavior and document the implementation for operators and future changes. |

**Tasks**

1. Add a short section to the repo (e.g. in `docs/` or README) that points to TA-2 and states: where audit events are produced (admin routes only), that audit is best-effort and non-blocking, and where to find the event shape and writer (file paths).
2. Optionally: add a unit test for the audit writer that asserts it never throws when the sink throws or fails.
3. Optionally: manual verification that one admin request (success and failure) produces the expected audit entry and that the response is unchanged when the sink is forced to fail.
4. No new production code paths; only tests and docs.

**Guardrails**

- Documentation must not describe or mandate a specific DB schema; reference "append-only storage" and leave schema to the migration ticket.
- Tests must not change admin route behavior or response contracts.

**Acceptance**

- Document exists and points to TA-2 and implementation locations.
- If tests are added: writer never propagates sink failure to caller; audit event shape is consistent with T1.
- No behavior change to admin API.

**Rollback**

- Remove the added doc section and any new tests. No impact on production audit flow.

---

## Ticket order and dependencies

| Order | Ticket | Depends on |
|-------|---------|------------|
| 1 | T1 — Event shape and types | — |
| 2 | T2 — Audit writer module | T1 |
| 3 | T3 — Append-only sink | T2 (writer contract) |
| 4 | T4 — Instrument one admin route (pilot) | T2 (sink can be stub until T3) |
| 5 | T5 — Instrument all remaining admin routes | T4 |
| 6 | T6 — Verification and documentation | T4 or T5 |

T3 can be done in parallel with T4 if the writer uses a stub/no-op sink until T3 is complete. T5 can start after T4 is accepted.

---

## References

- [TA-2 — Admin Audit Logging](architecture/TA-2_ADMIN_AUDIT_LOGGING.md)
- [TA-1 — Identity & Auth](architecture/TA-1_IDENTITY_AUTH.md) (requireAdminUser)
