# CM-2.5 — Conversation → Customer Linking  
## Audit Trail (Event Model, Design Only)

**Status:** Design only  
**Scope:** Conceptual audit events for conversation ↔ customer linking  
**Out of scope:** Code, migrations, storage implementation, UI  
**Dependencies:**  
- CM-2.1 — Resolution Path Definition  
- CM-2.2 — Implicit Linking Audit  
- CM-2.3 — Safe Write Rules  
- CM-2.4 — Read-only UI Signal  

**Alignment:** STEP 9, audit-first, human-in-control, RALPH-safe

---

## 1. Purpose

CM-2.5 defines an **append-only audit trail model** that records *what happened* during conversation ↔ customer linking, *without influencing behavior*.

The audit trail exists to:
- Provide explainability
- Support debugging and support
- Enable future compliance and due diligence
- Make manual actions defensible

CM-2.5 does **not** define:
- Storage schema
- Retention policy
- Query APIs
- UI exposure

---

## 2. Core Principles

- **Append-only**  
  Audit events are never mutated or deleted.

- **Write-after-fact**  
  Events record outcomes, never drive logic.

- **Non-blocking**  
  Failure to record an audit event must not block ingestion or UI.

- **Instructor-scoped**  
  Every event is associated with exactly one instructor context.

---

## 3. Event Categories

Audit events are grouped by intent, not by implementation detail.

### 3.1 Resolution Events (Read Path)

These events describe what happened during resolution, without implying a write.

#### `conversation.customer_resolved`

Emitted when:
- A deterministic resolution candidate exists
- No write necessarily occurs

Meaning:
- "A customer could be resolved under CM-2.1 rules"

---

#### `conversation.customer_unresolved`

Emitted when:
- Resolution was attempted
- No valid customer could be resolved

Meaning:
- "Resolution resulted in no link"

---

#### `conversation.customer_resolution_skipped`

Emitted when:
- Resolution was not attempted due to missing prerequisites  
  (e.g. missing instructor_id, invalid identifier)

Meaning:
- "Resolution was intentionally skipped"

---

### 3.2 Write Events (Explicit Actions)

These events describe **state changes** and must align with CM-2.3.

#### `conversation.customer_linked`

Emitted when:
- `conversation.customer_id` is written for the first time

Meaning:
- "Conversation explicitly linked to a customer"

---

#### `conversation.customer_unlinked`

Emitted when:
- An existing `customer_id` is removed by explicit action

Meaning:
- "Conversation explicitly unlinked from a customer"

---

#### `conversation.customer_relinked`

Emitted when:
- `customer_id` is changed from one value to another
- Explicit overwrite occurred

Meaning:
- "Conversation customer link was replaced intentionally"

---

## 4. Mandatory Event Fields (Conceptual)

Every audit event MUST conceptually include:

- `event_name`
- `conversation_id`
- `instructor_id`
- `actor_type` (human | system)
- `actor_id` (nullable if system)
- `timestamp`
- `context` (free-form, non-authoritative metadata)

Optional but recommended:
- `previous_customer_id`
- `new_customer_id`
- `reason` (explicit, human-provided where applicable)

---

## 5. Actor Semantics

- **Human actor**
  - Authenticated
  - Instructor-scoped
  - Responsible for explicit writes

- **System actor**
  - Deterministic
  - Never ambiguous
  - Used only where explicitly allowed (CM-2.3)

Actor identity must always be clear.

---

## 6. What the Audit Trail Must NOT Do

- Must not trigger writes
- Must not influence resolution
- Must not be used as source of truth
- Must not be editable
- Must not replace domain state

Audit is **observational**, never **operational**.

---

## 7. Failure Modes

- If audit event creation fails:
  - Linking or resolution must still proceed
  - System must fallback silently
  - No retries that block ingestion

Audit loss is acceptable.  
Data corruption is not.

---

## 8. Invariants Reaffirmed

- All customer writes are auditable
- All overwrites are explicit and traceable
- Resolution events do not imply linking
- Audit events are instructor-scoped
- No audit event causes side effects

---

## 9. Acceptance Criteria (Pass / Fail)

- Every explicit customer write emits exactly one audit event
- Resolution attempts emit at most one resolution event
- No audit event mutates domain state
- No customer link exists without a corresponding audit record
- Audit failures never block core flows

**Pass:** All conditions satisfied  
**Fail:** Missing, ambiguous, or side-effecting audit behavior

---

## 10. Outcome

CM-2.5 completes the **Conversation ↔ Customer Linking** design block.

The system now has:
- Deterministic resolution
- Safe write rules
- Clear UI visibility
- Full explainability through audit

Without coupling, automation, or hidden behavior.

---

*End of CM-2.5 design document.*
