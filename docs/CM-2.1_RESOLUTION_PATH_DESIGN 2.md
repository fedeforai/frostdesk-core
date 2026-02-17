# CM-2.1 — Conversation → Customer Linking  
## Resolution Path Definition (Design Only)

**Status:** Design only  
**Scope:** Definition of deterministic resolution order  
**Out of scope:** Implementation, migrations, writes, UI actions  
**Dependencies:** CM-1 — Customer Identifier Model (approved)  
**Alignment:** STEP 9 (Investor-grade, human-in-control)

---

## 1. Purpose

CM-2.1 defines **how a conversation MAY be resolved to a customer** in a deterministic, safe, and auditable way.

This document:
- Defines the **order of truth sources**
- Establishes **blocking principles**
- Specifies **safe fallbacks**
- Introduces **conceptual audit events**

CM-2.1 **does not perform any action**.  
It describes resolution logic only. No writes. No side effects.

---

## 2. Blocking Principles (Non-negotiable)

These principles must always hold.

- **Instructor-scoped always**  
  Customer resolution is strictly scoped to `instructor_id`.  
  Cross-instructor linking is forbidden.

- **No auto-merge**  
  Customers are never merged automatically.

- **Human-in-control**  
  The system may propose or signal, but never decide irreversibly.

- **Safe fallback**  
  If resolution is not certain, no link is created.

- **Zero silent overwrite**  
  No destructive or implicit write is allowed during resolution.

---

## 3. Resolution Path (Authoritative Order)

Resolution follows this **explicit and deterministic sequence**.

### Step 1 — Explicit link (highest priority)

If the conversation already has an explicit customer reference:

- `conversation.customer_id` exists  
  → **STOP**

This is the authoritative source of truth.  
No further resolution steps are evaluated.

---

### Step 2 — Deterministic identity match

If `conversation.customer_id` is **not present**:

- Use the tuple:
  - `instructor_id`
  - `channel`
  - `normalized_identifier`

- Perform lookup on `customers`:
  - If **exactly one** match exists  
    → Valid resolution candidate
  - If no match exists  
    → No resolution
  - If multiple matches exist  
    → No resolution

No writes are performed at this step.

---

### Step 3 — No resolution (fallback)

If any of the following is true:

- Identifier is missing
- Identifier cannot be normalized
- Instructor context is missing
- No customer found
- More than one potential match

→ **NO LINK**

The conversation remains unlinked.

This is an explicit and valid state.

---

## 4. What CM-2.1 Explicitly Does NOT Do

CM-2.1 must **never**:

- Create customers automatically
- Write or update `conversation.customer_id`
- Modify `channel_identity_mapping`
- Correct or backfill historical data
- Introduce UI actions or CTAs
- Trigger automations or background jobs

CM-2.1 **describes** resolution.  
It does not **execute** it.

---

## 5. Failure Modes and Safe Fallbacks

All failure scenarios resolve to **no link**.

- Identifier invalid or unparseable  
  → No resolution

- Customer not found  
  → No resolution

- `instructor_id` missing  
  → Abort resolution

- Database or lookup error  
  → Safe fallback (no resolution)

**Core rule:**  
It is always better to have **no customer** than the **wrong customer**.

---

## 6. Security and Invariants

The following invariants must never be violated:

- No cross-instructor customer access
- No implicit or silent overwrites
- No writes during resolution
- Resolution is deterministic and repeatable
- Explicit links always override inferred links

---

## 7. Conceptual Events (Design Only)

These events are conceptual and introduced for future audit and explainability.

- `conversation.customer_resolved`
- `conversation.customer_unresolved`
- `conversation.customer_resolution_skipped`

No schema or storage is defined at this stage.

---

## 8. Acceptance Criteria (Pass / Fail)

The following conditions must hold:

- A conversation never changes customer without explicit action
- Two conversations with the same identifier may remain unlinked
- No resolution occurs without `instructor_id`
- The resolution path is deterministic and repeatable
- The system performs zero writes during resolution

**Pass:** All conditions satisfied  
**Fail:** Any condition violated

---

## 9. Alignment Statement

CM-2.1 is fully aligned with:

- CM-1 (Customer Identifier Model)
- STEP 9 investor-grade requirements
- Human-in-control operating principles

No monetization, billing, AI automation, or architectural lock-in is introduced.

---

*End of CM-2.1 design document.*
