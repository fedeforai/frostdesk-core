# Conversation Simulation Harness — Runbook

> **Dev-only tool.** Runs 4 deterministic customer personas through the real AI inbound pipeline and produces a structured markdown report.

## Prerequisites

1. **Database accessible** — `DATABASE_URL` (or Supabase env vars) must point to a running Postgres instance with the FrostDesk schema applied.
2. **Migrations applied** — The `audit_log` table must include the `event_type` column (migration `20260229120000_audit_log_canonical_schema.sql` or later).
3. **`@frostdesk/db` built** — Run `pnpm -C packages/db run build` if you changed DB code recently.
4. **OpenAI key** — `OPENAI_API_KEY` must be set (used by the AI classification + draft pipeline). If the key is missing or invalid, the orchestrator will fail-open and report an error per test.
5. **Instructor profile exists** — The UUID you pass as `SIM_INSTRUCTOR_ID` must be a row in `instructor_profiles` (or `instructor_profiles_definitive`).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SIM_INSTRUCTOR_ID` | **Yes** | UUID of the instructor profile to simulate against. |
| `SIM_RUN_ID` | No | Human-readable tag for the run. Defaults to an ISO timestamp. |
| `PILOT_INSTRUCTOR_IDS` | No | Comma-separated UUIDs. If `SIM_INSTRUCTOR_ID` is not in this list, the report will flag 402 PILOT_ONLY for gated routes. The harness itself still runs. |
| `DEFAULT_INSTRUCTOR_ID` | No | Used by the webhook path to route conversations. The harness passes `SIM_INSTRUCTOR_ID` directly, so this is not needed for sim runs. |

## How to run

All commands below are run **from the repo root**.

### Option A — `pnpm -C` (recommended)

```bash
SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
  pnpm -C apps/api exec tsx src/dev/sim_harness.ts
```

With a custom run ID:

```bash
SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
SIM_RUN_ID=test-pilot-v1 \
  pnpm -C apps/api exec tsx src/dev/sim_harness.ts
```

### Option B — `pnpm --filter` (workspace filter)

```bash
SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
  pnpm --filter @frostdesk/api exec tsx src/dev/sim_harness.ts
```

### Option C — direct `tsx` from repo root

```bash
SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
  ./node_modules/.bin/tsx apps/api/src/dev/sim_harness.ts
```

> **Why `exec`?** In pnpm v10 `pnpm -C <dir> <bin>` treats `<bin>` as a pnpm subcommand. Adding `exec` tells pnpm to look up `tsx` in the package's `node_modules/.bin`.

The script:
1. Loads the same `.env` as the API server.
2. Upserts 4 customer profiles (idempotent).
3. Runs each test case sequentially through the real pipeline:
   - `resolveConversationByChannel` (creates/resolves conversation)
   - `persistInboundMessageWithInboxBridge` (persists inbound message)
   - `orchestrateInboundDraft` (AI classification + optional draft)
4. Gathers audit_log rows and booking rows for each test window.
5. Writes a markdown report to `docs/sim_reports/<SIM_RUN_ID>.md`.

## How to interpret the output

### Console output

```
=== FrostDesk Conversation Simulation Harness ===
Run ID:        2026-02-14T10-30-00-000Z
Instructor ID: 59a7c6d1-...
Pilot allowed: true
Test cases:    4

▶ Running T1 (info-only) ...
  ✔ T1 done (1230ms): ✓ draft | ✗ no bookings | 2 audit rows
▶ Running T2 (booking-complete) ...
  ✔ T2 done (980ms): ✓ draft | ✗ no bookings | 2 audit rows
...
📄 Report written to: docs/sim_reports/2026-02-14T10-30-00-000Z.md
=== Simulation complete ===
```

### Markdown report

The report (`docs/sim_reports/<RUN_ID>.md`) contains:

- **Summary table** — one row per test with draft/booking/audit/pilot status.
- **Per-test sections** — customer info, input message, pipeline output, pilot gating, bookings created, audit log summary.
- **Verification SQL** — query to check `event_type` / `action` alignment in `audit_log`.

### What to look for

| Scenario | Expected |
|---|---|
| T1 (info-only) | Draft generated (INFO_REQUEST intent), no bookings. |
| T2 (booking-complete) | Draft generated (NEW_BOOKING intent), no bookings created (AI does not autonomously create bookings in pilot mode). |
| T3 (ambiguity) | Draft may or may not generate (depends on confidence). No bookings. |
| T4 (off-topic) | No draft (irrelevant message), no bookings. |

> **Note:** The current pipeline never creates bookings autonomously. The "bookings created" column should always show 0 unless a future version adds autonomous booking creation.

## Test personas

| Key | Name | Phone | Test |
|---|---|---|---|
| C1 | Luca Rossi | +41791234501 | T1 info-only |
| C2 | Sara Johnson | +44771234502 | T2 booking-complete |
| C3 | Marco Bianchi | +39331234503 | T3 ambiguity |
| C4 | Mamma Rosa | +39339876504 | T4 off-topic |

## Common failures

### 402 PILOT_ONLY

**Symptom:** Report shows `402 PILOT_ONLY` in the pilot column.

**Cause:** `SIM_INSTRUCTOR_ID` is not listed in `PILOT_INSTRUCTOR_IDS` env var.

**Fix:** Add the instructor UUID to `PILOT_INSTRUCTOR_IDS`:
```bash
PILOT_INSTRUCTOR_IDS=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
  pnpm -C apps/api exec tsx src/dev/sim_harness.ts
```

The harness still completes — it flags the block but does not abort.

### Missing instructor profile

**Symptom:** Error `Instructor profile not found` or conversation resolution fails.

**Fix:** Ensure the UUID exists in `instructor_profiles`:
```sql
SELECT id FROM instructor_profiles WHERE id = '<UUID>' OR user_id = '<UUID>';
```

### Missing audit_log event_type column

**Symptom:** `column "event_type" of relation "audit_log" does not exist`

**Fix:** Apply the canonical schema migration:
```bash
pnpm -C packages/db run build
# Then apply: supabase/migrations/20260229120000_audit_log_canonical_schema.sql
```

### OpenAI / upstream down

**Symptom:** Orchestrator error mentioning `ECONNREFUSED`, `timeout`, or OpenAI API errors.

**Fix:** Check `OPENAI_API_KEY` is valid and the API is reachable. The harness reports the error per-test but does not abort the run.

### Database connection refused

**Symptom:** `ECONNREFUSED` on the Postgres connection.

**Fix:** Ensure `DATABASE_URL` points to a running instance and the connection pool isn't exhausted.

## Cleanup

The harness creates:
- **Customer profiles** with `source = 'sim_harness'` — safe to keep or delete:
  ```sql
  DELETE FROM customer_profiles WHERE source = 'sim_harness';
  ```
- **Conversations** and **messages** for the simulated phone numbers — safe to keep for debugging.
- **AI snapshots** and **drafts** — linked to the simulated messages.
- **Audit log rows** — `request_id` starts with `sim_` for easy filtering:
  ```sql
  SELECT * FROM audit_log WHERE request_id LIKE 'sim_%' ORDER BY created_at DESC;
  ```

## Extending the harness

To add more test cases, edit the `TEST_CASES` array in `apps/api/src/dev/sim_harness.ts`. Each test case needs:

```typescript
{
  id: 'T5',              // unique ID
  label: 'my-new-test',  // human-readable label
  personaKey: 'C1',      // one of the PERSONAS keys
  messageText: '...',    // the inbound message
  expectsDraft: true,    // expectation (for docs only, not asserted)
  expectsBooking: false, // expectation (for docs only, not asserted)
}
```

Add new personas to the `PERSONAS` array with unique phone numbers.
