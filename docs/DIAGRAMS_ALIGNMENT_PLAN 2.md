# Piano di allineamento codice ↔ diagrammi (P2)

**Obiettivo:** portare il codice in linea con le specifiche dei diagrammi in `docs/diagrams/`, senza violare le invarianti.

**Source of truth:**
- [docs/architecture/INVARIANTS.md](architecture/INVARIANTS.md) — **canonical** invariants (post–Loop 5)
- [docs/architecture/INVARIANTS_P2.md](architecture/INVARIANTS_P2.md) — earlier P2 formulation
- [docs/diagrams/](diagrams/) — diagrammi Mermaid
- [docs/architecture/CURSOR_IMPLEMENTATION_P2.md](architecture/CURSOR_IMPLEMENTATION_P2.md) — guardrails, ordine di esecuzione, prompt Loop 0

**Discovery:** [DISCOVERY_BOOKING_DOMAIN_AND_DB.md](DISCOVERY_BOOKING_DOMAIN_AND_DB.md) — stato attuale booking/DB.

---

## Naming alignment (diagram vs code/DB)

**Diagram state names use UPPERCASE** (e.g. `DRAFT`, `PENDING`, `CONFIRMED`) for readability and to match Mermaid conventions.

**DB and code use lowercase** (e.g. `draft`, `pending`, `confirmed`) for enum values and status columns.

This mapping is **intentional and stable**. When aligning behavior:
- Update the diagram to match code if there is a mismatch.
- Do **not** rename code or DB values to uppercase for diagram consistency.

---

## Terminologia e decisioni (confermate)

**Diagram state names (e.g. CONFIRMED) map to lowercase values in code and DB (e.g. confirmed).**

- **Proposed** is not a booking status; it lives at draft level (AI/instructor suggestions). **Pending** is the real booking request state (persisted, awaiting accept/reject).
- **AI_PAUSED_BY_HUMAN** is triggered only by manual “I replied on WhatsApp” or tracked outbound from FrostDesk UI. No inference from WhatsApp device.

---

## Order of execution (mandatory)

**Order of execution is mandatory:** Loop 0 (booking schema reconciliation) must be completed before implementing any state machine or API changes.

1. Loop 0 — Booking schema reconciliation (Supabase migration only)
2. Booking state machine + audit
3. Instructor booking APIs (submit, accept, reject, modify, cancel)
4. Calendar read-first conflicts
5. Manual handoff referrals
6. AI conversation state machine (persisted)
7. Observability + timezone

Details and stop conditions: [CURSOR_IMPLEMENTATION_P2.md](architecture/CURSOR_IMPLEMENTATION_P2.md).

---

## Migration rule

All migrations that touch live schema go in **`supabase/migrations/`**. `packages/db/migrations/` is not the source of truth for schema.
