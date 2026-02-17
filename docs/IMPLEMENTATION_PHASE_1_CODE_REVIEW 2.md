# Customer Memory Phase 1 — Code Review Checklist

**Use:** Keep this open during every PR. If any item fails, the PR does not pass.  
**Scope:** CM-1 + CM-2 (T1–T6). Reference: CM-1, CM-2.1–CM-2.5, IMPLEMENTATION_PHASE_1_CM1_CM2.md.

---

## A. Global rules (initial gate)

Before reading code:

- [ ] The PR clearly maps to **one** of T1, T2, T3, T4, T5, or T6.
- [ ] No ticket out of Phase 1 scope.
- [ ] No behavior not described in the CM design docs.
- [ ] No “temporary convenience” that changes semantics.
- [ ] No TODO that changes semantics.

**If any of these fails: stop review.**

---

## B. Backend — Data model (T1) — Customers table

- [ ] Table `customers` contains only approved columns.
- [ ] Unique constraint `(instructor_id, channel, normalized_identifier)` is present.
- [ ] No automatic backfill.
- [ ] No triggers.
- [ ] No implicit FK that blocks existing flows.

**Sanity check:**
- [ ] Same identifier + same instructor → insert fails (duplicate).
- [ ] Same identifier + different instructor → insert succeeds.

---

## C. Backend — Normalization (T2)

- [ ] There is **exactly one** normalization function.
- [ ] Function is pure and deterministic.
- [ ] No write inside the function.
- [ ] Invalid input returns `null`, not a fallback value.

**Red flag:** Multiple similar functions or duplicated inline normalization.

---

## D. Backend — Resolution read-only (T3)

- [ ] Resolution follows CM-2.1 exactly.
- [ ] Step 1: `conversation.customer_id` short-circuit.
- [ ] Step 2: Lookup `customers` with instructor scope.
- [ ] Step 3: Fallback = no resolution.

**Critical guardrails:**
- [ ] No write.
- [ ] No update to `conversation`.
- [ ] No customer creation.

**If the code writes anything here: PR rejected.**

---

## E. Backend — Explicit write path (T4)

- [ ] There is **only one** place where `conversation.customer_id` is written (for this feature).
- [ ] Instructor ownership validated on conversation.
- [ ] Instructor ownership validated on customer.
- [ ] Overwrite allowed only with an explicit flag/parameter.

**Red flag:** Auto-link, write in ingestion, or write “because it’s obvious”.

---

## F. Backend — Audit events (T5)

- [ ] Every write emits exactly one event.
- [ ] Events are append-only.
- [ ] Audit failure does not block the write.
- [ ] Actor type is explicit (human or system).

**If there is a write without an event: PR rejected.**

---

## G. Frontend — UI badge (T6)

- [ ] Badge is informational only.
- [ ] States are exactly: **Known** / **New** / **Unlinked**.
- [ ] Minimal copy always visible.
- [ ] No CTA.
- [ ] No click handler on the badge.
- [ ] Feature flag in place.

**Red flag:** Tooltip that “explains what to do”, warning/success colors, or polling to change state.

---

## H. Cross-cutting checks

- [ ] No customer query without `instructor_id`.
- [ ] No new coupling with ingestion (webhook path unchanged in behavior).
- [ ] No obvious performance regression.
- [ ] The change is deployable on its own (no hidden dependency on unmerged work).

---

## Verdict

- **Approve** only if **all** sections (A–H) pass for the scope of the PR.
- **Request changes** if **any** item fails.

---

*Use this checklist for every Phase 1 PR (T1 through T6).*
