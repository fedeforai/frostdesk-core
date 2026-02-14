# FrostDesk — Architecture Invariants (Canonical)

**Status:** FROZEN (post–Loop 5)  
**Scope:** All diagrams, code changes, and Cursor prompts must comply with these rules.

This file is the single source of truth for non-negotiable invariants. No feature or refactor may violate them.

---

## 1. AI suggests, human decides

- AI never sends messages.
- AI never confirms bookings.
- AI never changes ownership or assigns conversations.
- Every decision that affects the customer or the system is taken by a human.

---

## 2. No silent automation

- No auto-confirmation of bookings.
- No automatic calendar writes.
- No automatic handoff or reassignment.
- No inference of state from external channels (e.g. “replied on WhatsApp” is not inferred; it is set explicitly in the UI).

---

## 3. No background workers

- No cron jobs.
- No schedulers or queues for automation.
- Time-based logic (e.g. expiry) is evaluated on read or on explicit action, not by a worker.

---

## 4. Draft ≠ booking

- Proposals and alternatives live at draft level.
- A booking represents operational truth only after an explicit submit/accept path.
- Draft state is internal; it is not a booking state visible to the customer as “booked”.

---

## 5. Booking ≠ payment

- Booking lifecycle is independent of payment.
- Payment logic is out of scope for the current baseline; do not couple booking state to payment state.

---

## 6. Handoff ≠ booking

- Handoff is a conversation ownership change between instructors.
- It does not create, modify, or cancel bookings.
- It does not touch calendar or AI state automatically.

---

## 7. Calendar is read-first

- Calendar is a safety and visibility layer, not an automation engine.
- Conflicts are surfaced to the UI; they are never auto-resolved.
- External calendar cache is informative, not authoritative for booking decisions.
- No silent writes to external calendars from FrostDesk.

---

## 8. Ownership is explicit

- Conversation ownership has a single source of truth (e.g. `conversations.instructor_id` or last handoff event).
- Ownership changes only via explicit human action (e.g. POST handoff), with audit.
- No auto-assign; no AI ownership.

---

## 9. UTC in DB, local only in UI

- All database timestamps are stored in UTC (`timestamptz`).
- Display and messaging apply timezone rules in the UI or at the boundary; the core stores and reasons in UTC.

---

## 10. Every state transition is auditable

- Booking state transitions are explicit and logged.
- Handoff events are append-only and logged.
- AI state changes (e.g. pause/reactivate) are auditable.
- No state change without an audit trail suitable for replay and dispute resolution.

---

## Appendix: Timeline semantics

- Timeline events are a direct projection of persisted records.
- Some real-world actions may appear as multiple events (e.g. handoff generates an operational record and an audit record).
- This is intentional and preserves audit completeness.

---

## Related docs

- [DIAGRAMS_ALIGNMENT_PLAN.md](../DIAGRAMS_ALIGNMENT_PLAN.md) — diagram ↔ code alignment, loop order.
- [docs/diagrams/README.md](../diagrams/README.md) — diagram index and execution order.
- [INVARIANTS_P2.md](INVARIANTS_P2.md) — earlier P2 formulation; INVARIANTS.md is canonical.
