# CM-2.3 — Conversation → Customer Linking  
## Safe Write Rules (Design Only)

**Status:** Design only  
**Scope:** Rules governing when and how customer links may be written  
**Out of scope:** Code, migrations, UI actions, automations  
**Dependencies:**  
- CM-1 — Customer Identifier Model (approved)  
- CM-2.1 — Resolution Path Definition (approved)  
- CM-2.2 — Implicit Linking Audit (approved)  

**Alignment:** STEP 9, human-in-control, audit-first, RALPH-safe

---

## 1. Purpose

CM-2.3 defines **the only allowed conditions under which a conversation may be linked to a customer**.

This document:
- Defines **who is allowed to write**
- Defines **when a write is permitted**
- Defines **what is strictly forbidden**
- Defines **what must be audited**

CM-2.3 introduces **rules**, not behavior.  
No code. No side effects.

---

## 2. Core Principle

**Writing customer_id is a privileged operation.**

It must be:
- Explicit
- Instructor-scoped
- Auditable
- Reversible by human action only

---

## 3. Allowed Write Scenarios

A write to `conversation.customer_id` is permitted **only** in the following cases.

### 3.1 Explicit human action (primary path)

A human actor explicitly links a conversation to a customer.

Conditions:
- Actor is authenticated
- Actor owns the `instructor_id`
- Target customer belongs to the same `instructor_id`
- Conversation is not already linked, or overwrite is explicitly confirmed

Result:
- `conversation.customer_id` may be written or updated
- Action must be audited

---

### 3.2 Deterministic system write with explicit guarantee (future, guarded)

A system-initiated write MAY be allowed only if:

- Resolution followed CM-2.1 exactly
- Match is unique and deterministic
- Instructor scope is guaranteed
- No ambiguity exists
- Write is explicitly classified as "safe auto-link"

This path is **disabled by default** and requires:
- Explicit product decision
- Explicit audit trail
- Clear UI visibility

---

## 4. Forbidden Write Scenarios

The following are **never allowed**.

### 4.1 Implicit writes during resolution

- Resolution logic must never write
- Resolution must be read-only
- No side effects during ingestion

---

### 4.2 Cross-instructor writes

- A conversation must never be linked to a customer owned by another instructor
- Even if identifiers match

---

### 4.3 Silent overwrites

- An existing `conversation.customer_id` must never be replaced:
  - implicitly
  - automatically
  - without explicit confirmation

---

### 4.4 Writes based on non-authoritative sources

Forbidden sources:
- `sender_identity`
- `channel_identity_mapping`
- raw `customer_identifier` without normalization and instructor scope

---

## 5. Overwrite Rules

If a conversation already has a `customer_id`:

- Overwrite is **forbidden by default**
- Allowed only via:
  - explicit human action
  - explicit overwrite intent
  - full audit trail

No "best guess". No heuristic correction.

---

## 6. Audit Requirements

Every permitted write must generate an audit record.

Minimum audit fields (conceptual):

- conversation_id
- previous_customer_id (nullable)
- new_customer_id
- actor_type (human | system)
- actor_id (if human)
- timestamp
- reason (explicit, not inferred)

No audit → no write.

---

## 7. Failure Modes

If any requirement is not met:

- The write must not occur
- The system must fallback safely
- The conversation remains unlinked or unchanged

Key rule:
**Write failure must never block ingestion or UI.**

---

## 8. Invariants Reaffirmed

- One conversation has 0 or 1 customer
- A customer belongs to exactly one instructor
- No customer link is created without instructor context
- All writes are auditable
- Resolution and writing are separate concerns

---

## 9. Acceptance Criteria (Pass / Fail)

- No conversation changes customer without explicit permission
- All writes are instructor-scoped
- All writes generate audit events
- Resolution logic never writes
- Overwrites are explicit and traceable

**Pass:** All conditions satisfied  
**Fail:** Any implicit or unaudited write exists

---

## 10. Outcome

CM-2.3 establishes **strict safety boundaries** for Customer Memory.

It guarantees:
- Trust in customer history
- Explainability to instructors
- Defensibility to investors and auditors

---

*End of CM-2.3 design document.*
