# Customer Memory — Phase 1 Implementation (CM-1 + CM-2)

**Status:** Implementation plan (design complete; execution pending)  
**Scope:** Minimal viable truth — make Customer Memory real in prod without automation debt  
**Out of scope (Phase 1):** CM-3, CM-4, CM-5, CM-6; auto-link; merge; mass backfill  
**Dependencies:** CM-1, CM-2.1–CM-2.5 (all LOCKED)

---

## 1. Priority rationale

- **First:** Reduce systemic risk while enabling perceived value (close the gap between design and reality).
- **Then:** Extend (CM-3, CM-4, CM-5).

Without a real customer entity and linking in prod, CM-3/4/5 would be UI on thin air. Phase 1 implements only what is already LOCKED in the design docs.

---

## 2. CM-2 status (confirmed)

- CM-2 (Conversation ↔ Customer Linking) is **closed**, defensible, explainable, and ready for incremental implementation.
- No further product decisions required for Phase 1.

---

## 3. Phase 1 objective

Make Customer Memory **real** in production:

- Stable customer identity (CM-1)
- Deterministic read resolution (CM-2.1)
- Explicit, audited writes only (CM-2.3)
- Read-only UI signal (CM-2.4)
- Append-only audit events (CM-2.5)

No new features. Only implementation of the locked design.

---

## 4. Operating principles

- No behavior not described in the design docs.
- Read path and write path are always separate.
- Every write is explicit and audited.
- Each step is independently deployable.
- If something is unclear → stop; do not guess.

---

## 5. Execution order — ticket breakdown

Tickets are executed in this order. No reordering without explicit approval.

---

### T1 — CM-1.1 Create customers table

**Owner:** Backend  
**Scope:** DB only

**Tasks:**
- Create table `customers`.
- Columns: `id`, `instructor_id`, `channel`, `normalized_identifier`, `created_at`.
- Unique constraint: `(instructor_id, channel, normalized_identifier)`.

**Guardrails:**
- No backfill.
- No merge.
- No triggers.
- No mandatory FKs beyond `instructor_id` (if instructor entity exists).

**Acceptance:**
- Duplicate `(instructor_id, channel, normalized_identifier)` fails.
- Same identifier with different instructor succeeds (distinct row).

**Output:** Isolated migration; defined rollback.

---

### T2 — CM-1.2 Identifier normalization

**Owner:** Backend  
**Scope:** Logic only

**Tasks:**
- Implement a **pure** normalization function.
- Input: raw identifier.
- Output: `normalized_identifier` or `null`.

**Guardrails:**
- No writes.
- No creative fallback (invalid → null only).

**Acceptance:**
- Same input → same output (idempotent).
- Invalid input → `null`.

---

### T3 — CM-2.1 Read-only resolution

**Owner:** Backend  
**Scope:** Read path only

**Tasks:**
- Implement resolution function that follows CM-2.1 exactly:
  1. If `conversation.customer_id` present → resolved (stop).
  2. Else lookup `customers` by `(instructor_id, channel, normalized_identifier)`.
  3. Else → no resolution (unlinked).

**Guardrails:**
- Zero writes.
- Zero updates to `conversation` or any other table.

**Acceptance:**
- Function is idempotent.
- No data change after call.

---

### T4 — CM-2.3 Explicit linking (human-only)

**Owner:** Backend  
**Scope:** Write path, controlled

**Tasks:**
- Implement endpoint or internal action for explicit link conversation → customer.
- Validations: instructor ownership, customer ownership, explicit overwrite when conversation already has `customer_id`.
- Write `conversation.customer_id` only when validation passes.

**Guardrails:**
- No auto-link.
- No heuristics.
- No system actor by default.

**Acceptance:**
- Link only when ownership is valid.
- Overwrite only when explicitly requested.

---

### T5 — CM-2.5 Audit events (write only)

**Owner:** Backend  
**Scope:** Audit infra

**Tasks:**
- Emit append-only events:
  - `conversation.customer_linked`
  - `conversation.customer_unlinked`
  - `conversation.customer_relinked`

**Guardrails:**
- Append-only.
- Audit failure must not block the write.

**Acceptance:**
- Every successful write produces one event.
- Write succeeds even if audit emission fails.

---

### T6 — CM-2.4 UI badge (read-only)

**Owner:** Frontend  
**Scope:** UI only

**Tasks:**
- Badge in conversation list.
- Badge in conversation view.
- States: **Known customer** / **New customer** / **Unlinked** (per CM-2.4).
- Feature-flagged.

**Guardrails:**
- No CTA.
- No write from UI.
- No inference (e.g. “looks new so…”).

**Acceptance:**
- Exactly one state per conversation.
- No user interaction changes data.

---

## 6. Step 0 — Pre-flight check (before T1)

**Purpose:** Avoid surprises before touching DB or API.

**Checklist:**
- [ ] CM-1 and CM-2.1–CM-2.5 docs present in repo and versioned.
- [ ] Dev and prod schema alignment understood.
- [ ] Feature flag available for UI badge (e.g. hardcoded `false` until T6).
- [ ] No hidden UI dependency on `customer_identifier` that would break.

**Deliverable:** Confirm scope and non-goals (this document); proceed to T1 only when pre-flight is done.

---

## 7. What is NOT in Phase 1

- CM-3 (Customer History View)
- CM-4 (Internal Notes)
- CM-5 (Trust Signals)
- CM-6 (Advanced hardening)
- Auto-link
- Customer merge
- Mass backfill

---

## 8. Phase 1 completion criteria

- [ ] No conversation is linked automatically.
- [ ] No cross-instructor linking is possible.
- [ ] UI shows correct state (Known / New / Unlinked) per conversation.
- [ ] Audit events are emitted for every write.
- [ ] Existing ingestion behavior is unchanged.

When all are true → Phase 1 is complete.

---

## 9. Outcome after Phase 1

- Customer Memory exists in prod.
- UI state is truthful.
- Every link is explainable and audited.
- Future extensions (CM-3, CM-4, CM-5) can be built linearly.

---

*End of Implementation Phase 1 plan. Execute tickets T1–T6 in order.*
