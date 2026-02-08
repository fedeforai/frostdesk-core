# Customer Memory Phase 1 — Implementation Checklist

**Use:** During implementation and code review. Not a substitute for `IMPLEMENTATION_PHASE_1_CM1_CM2.md`.  
**Reference:** CM-1, CM-2.1–CM-2.5 (all LOCKED).

---

## 1. Golden rules

- If it’s not in the design docs → don’t implement it.
- Read path and write path are separate.
- Every write is audited.
- No “clever” inference.

---

## 2. Backend checklist

- [ ] No customer query without `instructor_id` in scope.
- [ ] No write inside resolution logic (CM-2.1 is read-only).
- [ ] Unique constraint `(instructor_id, channel, normalized_identifier)` tested (duplicate fails; different instructor passes).
- [ ] One single normalization function; used everywhere; no ad-hoc variants.
- [ ] `conversation.customer_id` overwrite only when explicitly requested and validated.
- [ ] Audit emission failure does not fail the main flow (write succeeds even if audit fails).

---

## 3. Frontend checklist

- [ ] Badge is informational only (Known / New / Unlinked).
- [ ] No click handler that writes or triggers linking.
- [ ] No logic like “looks new so we show…” (state from data only).
- [ ] Same badge semantics in list and in conversation view.
- [ ] Feature flag in place (e.g. can disable badge without breaking app).

---

## 4. DevOps / release

- [ ] Migration is isolated and has a defined rollback.
- [ ] Deploy possible ticket-by-ticket (no hidden coupling).
- [ ] No new dependency that forces a big-bang release.

---

## 5. Sanity check — where we could break

| Risk | Symptom | Mitigation |
|------|---------|------------|
| Customer lookup without instructor scope | “Shared” customers across instructors | Mandatory `instructor_id` in every customer query; assert in code review. |
| Divergent normalization | Silent duplicate customers | Single normalization function; no overrides or copy-paste variants. |
| UI that suggests action | Instructor thinks they can “do something” from the badge | No CTA; neutral copy; no buttons/links on badge. |
| Auto-link added “for convenience” | Linking that can’t be explained | Code review with CM-2.3 open; no write in resolution or ingestion. |
| Audit treated as “nice to have” | Writes not defensible | No write path without corresponding audit event; audit failure must not block write. |

---

*Use this checklist while implementing T1–T6 and during PR review.*
