# CM-2.4 — Conversation → Customer Linking  
## Read-only UI Signal (Design Only)

**Status:** Design only  
**Scope:** UI signalization of customer linking state  
**Out of scope:** Writes, actions, automations, UI controls  
**Dependencies:**  
- CM-2.1 — Resolution Path Definition (approved)  
- CM-2.2 — Implicit Linking Audit (approved)  
- CM-2.3 — Safe Write Rules (approved)  

**Alignment:** STEP 9, human-in-control, audit-first, RALPH-safe

---

## 1. Purpose

CM-2.4 defines a **read-only UI signal** that informs the instructor about the customer linking state of a conversation.

The UI:
- Displays the current state
- Does not allow actions
- Does not trigger writes
- Does not influence resolution

**Core principle:**  
*Showing information must never imply decision-making.*

---

## 2. UI States (Mutually Exclusive)

Each conversation MUST display **exactly one** of the following states.

---

### State A — Known Customer

**Condition:**
- `conversation.customer_id` is present

**UI Signal:**
- Label: `Known customer`
- Icon: neutral, informational
- Color: subtle, non-success

**Secondary copy (always visible, minimal):**
- `This customer is already known to you`

**Semantics:**
- Indicates an explicit customer link already exists
- Does not imply trust, priority, or preference

---

### State B — New Customer

**Condition:**
- `conversation.customer_id` is absent
- Deterministic match is possible per CM-2.1 (Step 2)
- A customer exists but is not yet linked to this conversation

**UI Signal:**
- Label: `New customer`

**Secondary copy (always visible, minimal):**
- `First interaction with this customer`

**Semantics:**
- "New" does not mean the customer does not exist
- "New" means not yet linked to this conversation

---

### State C — Unlinked

**Condition:**
- `conversation.customer_id` is absent
- No deterministic resolution is possible

**UI Signal:**
- Label: `Unlinked`

**Secondary copy (always visible, minimal):**
- `Customer not resolved`

**Semantics:**
- Indicates absence of resolution
- Does not indicate error or failure

---

## 3. UI Invariants (Non-negotiable)

These invariants must be explicitly enforced.

### 3.1 Absolute read-only behavior

- No buttons
- No links
- No CTAs
- No hover actions suggesting edits

---

### 3.2 No writes, no side effects

- The UI must not write data
- The UI must not propose linking actions
- The UI must not trigger background processes

---

### 3.3 No auto-upgrade or inference

The UI state must NOT change due to:
- Polling
- Confidence thresholds
- Inference or heuristics

State changes only if the underlying data changes outside CM-2.4.

---

### 3.4 No semantic ambiguity

- "Known" does not imply trust
- "New" does not imply risk
- "Unlinked" does not imply error

All states are **informational**, not evaluative.

---

## 4. Mapping to CM-2.x

| UI State | Source of Truth |
|----------|-----------------|
| Known customer | CM-2.3 — explicit write already performed |
| New customer | CM-2.1 — deterministic match possible |
| Unlinked | CM-2.1 — fallback "no resolution" |

The UI reflects state.  
It does not interpret it.

---

## 5. UI Placement Rules

- A small badge MUST be shown:
  - Inline in the conversation list
  - Inside the conversation view

- The badge must be:
  - Consistent in label, color, and copy
  - Identical in semantics across views

No alternate representations are allowed.

---

## 6. Explicit Non-Goals

CM-2.4 explicitly does NOT:

- Allow manual linking
- Suggest merges
- Display customer history
- Display trust signals
- Expose audit data
- Modify ingestion or resolution behavior

---

## 7. Performance Constraints

- No additional heavy queries
- State derivation must be lightweight
- UI must remain responsive even if customer data is missing

Graceful degradation is required.

---

## 8. Acceptance Criteria (Pass / Fail)

- Every conversation displays exactly one state
- No UI interaction modifies data
- State is consistent with CM-2.1 and CM-2.3
- UI is understandable without training
- No performance regression is introduced

**Pass:** All criteria satisfied  
**Fail:** Any ambiguity, write, or side effect exists

---

## 9. Outcome

CM-2.4 provides **clear visibility without control**, enabling instructors to understand context while preserving system safety.

It prepares the ground for:
- CM-3 — Customer History View
- CM-5 — Trust Signals

Without introducing risk or coupling.

---

*End of CM-2.4 design document.*
