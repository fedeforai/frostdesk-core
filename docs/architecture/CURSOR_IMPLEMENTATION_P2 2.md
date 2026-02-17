# Cursor RALPH-safe — Implementation P2

Guardrails and mandatory execution order for Cursor. See [INVARIANTS_P2.md](INVARIANTS_P2.md) as capstone.

## 1. Guardrails (non-negotiable)

### 1.1 Absolute guardrails

- **If it’s not in a diagram → it doesn’t exist**
- **If a transition isn’t in the diagram → it’s a bug**
- **If Cursor has to “guess” → it must stop**

### 1.2 SAFE for Cursor (no approval needed)

**Schema:** Add missing columns; add enum values additively; add indexes; add new tables when specified by diagrams; add audit log.

**Code:** Implement state machine exactly as in diagrams; add new non-breaking endpoints; add validations that block disallowed transitions; add tests that fail on forbidden transitions; refactor only when behavior-identical.

**Read:** Read calendar; read timeline; read audit; compute expire on read.

### 1.3 NOT SAFE (forbidden)

- **Architecture:** No cron / worker / scheduler; no implicit automation; no unrequested “smart helpers”; no states not in diagrams.
- **Booking:** No auto-confirm; no auto-cancel; no auto-expire via job; no linking booking to payments; no writing to calendar.
- **AI:** AI must not send messages, change state, perform handoff, or make operational decisions.
- **Inference:** No inferring “instructor replied from WhatsApp”; no inferring non-explicit intents; no inferring transitions.

### 1.4 RALPH-safe golden rule

Any action that changes state must be:

- explicit
- human or declared system
- traced
- present in a diagram

If any of these is missing → do not implement.

---

## 2. Mandatory execution order

1. **Loop 0** — Booking schema reconciliation (Supabase migration only)
2. **Booking state machine** — States and transitions from diagrams + audit
3. **Instructor booking APIs** — submit, accept, reject, modify, cancel
4. **Calendar read-first conflicts** — Safety layer, no writes
5. **Manual handoff referrals** — Human-initiated only
6. **AI conversation state machine** — Persisted `ai_state`, explicit pause/reactivate
7. **Observability + timezone** — Decision timeline, timezone helpers

Diagrams must be implemented in this order.

---

## 3. Migration rule (fixed)

**All migrations that touch live schema go in `supabase/migrations/`.**

`packages/db/migrations/` is **not** the source of truth for schema. Loop 0 reconciles the real DB (Supabase) with repository usage.

---

## 4. Loop 0 — Prompt for Cursor (definitive)

Use this as the next prompt after reading invariants and discovery.

```
You are running Cursor RALPH-safe Loop 0 (schema reconciliation).

Database is LIVE and Supabase-managed.

Scope:
- Reconcile booking DB schema with repository usage.
- NO behavior changes.
- NO new endpoints.
- NO state machine changes.
- NO enum/CHECK/status changes.

Read:
- docs/DISCOVERY_BOOKING_DOMAIN_AND_DB.md
- docs/DIAGRAMS_ALIGNMENT_PLAN.md

Task:
1) List every column referenced by:
   - packages/db/src/booking_repository.ts
   - packages/db/src/admin_booking_repository.ts
   - packages/db/src/admin_booking_detail_repository.ts
   - packages/db/src/ai_booking_confirm_repository.ts
   - packages/db/src/bookings.ts
2) Compare with the actual booking table definition in Supabase.
3) Create ONE additive SQL migration under:
   supabase/migrations/
   that adds all missing columns so all existing code paths are valid.
   - Add safe defaults when needed.
   - Do not drop or rename anything.
   - Do not touch booking status or constraints.

Return format:
- Migration filename and full SQL
- Bullet list of schema drift fixed
- Explicit confirmation: "No behavior change introduced"

Stop after Loop 0. Do not proceed further.
```

---

## 5. Phase stop conditions (summary)

| Phase | Stop condition |
|-------|----------------|
| Loop 0 | No INSERT hits non-existent columns; existing tests pass unchanged |
| Booking state machine | Allowed transitions pass; forbidden transitions fail; audit always written |
| Instructor APIs | Admin override unchanged; instructor cannot perform disallowed transitions |
| Calendar read-first | No calendar writes; booking remains human action |
| Handoff | No auto-assign; AI cannot execute handoff |
| AI state | AI cannot act when `ai_paused_by_human`; no automatic pause from WhatsApp device |
| Observability | All decisions explainable; no ambiguous timestamps |
