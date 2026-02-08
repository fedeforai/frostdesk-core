# CM-2.2 — Conversation → Customer Linking  
## Implicit Linking Audit (Design Only)

**Status:** Design only  
**Scope:** Audit of current implicit linking paths  
**Out of scope:** Code changes, migrations, fixes, refactors  
**Dependencies:** CM-1 (approved), CM-2.1 (approved)  
**Alignment:** STEP 9, human-in-control, RALPH-safe

---

## 1. Purpose

CM-2.2 identifies **where and how conversation to customer linking happens implicitly today**, and evaluates each path against the rules defined in CM-1 and CM-2.1.

The goal is to:
- Expose unsafe or ambiguous resolution paths
- Identify cross-instructor or overwrite risks
- Classify which paths must be frozen, guarded, or made explicit later

CM-2.2 **does not propose fixes**.  
It only documents reality and risk.

---

## 2. Definition of "Implicit Linking"

For the purpose of this audit, an implicit linking path is any logic where:

- A conversation is resolved or reused based on an identifier
- Without an explicit `customer_id`
- Without a deterministic, instructor-scoped resolution step
- Or with side effects that are not clearly audit-safe

---

## 3. Identified Linking Paths

### 3.1 Conversation resolution by customer_identifier

**Observed behavior:**
- Conversations are resolved using `customer_identifier`
- Lookup may occur without scoping by `instructor_id`
- Channel is not always part of the lookup

**Risk assessment:**
- High risk of cross-instructor reuse
- Identifier collisions across instructors possible
- Violates instructor-scoped invariant

**Status:**
- ❌ Unsafe
- Must not be treated as customer resolution

---

### 3.2 channel_identity_mapping resolution

**Observed behavior:**
- Mapping uses `(channel, customer_identifier)` as a global unique key
- No `instructor_id` in uniqueness or lookup
- First writer wins behavior

**Risk assessment:**
- One identifier per channel globally
- Multiple instructors cannot safely share the same identifier
- Implicit global ownership of identity

**Status:**
- ❌ Unsafe for customer linking
- Acceptable only as low-level conversation routing, not identity

---

### 3.3 Inbound message sender_identity fallback

**Observed behavior:**
- `sender_identity` stored per inbound message
- Used as fallback to determine WhatsApp target
- Not normalized or instructor-scoped at persistence level

**Risk assessment:**
- Append-only and read-only usage is safe
- Dangerous if reused as customer identity source
- No guarantee of uniqueness or normalization

**Status:**
- ⚠️ Read-only safe
- ❌ Unsafe as linking authority

---

### 3.4 Reuse of open conversation by identifier

**Observed behavior:**
- An open conversation may be reused if identifier matches
- Resolution may ignore instructor boundary

**Risk assessment:**
- Silent reuse of conversation across instructors possible
- Implicit overwrite of conversation context
- Violates zero silent overwrite principle

**Status:**
- ❌ Unsafe
- Must be guarded or disabled in future steps

---

## 4. Summary of Risks

| Area | Risk Type | Severity |
|------|-----------|----------|
| customer_identifier lookup | Cross-instructor leakage | High |
| channel_identity_mapping | Global identity collision | High |
| sender_identity fallback | Ambiguous identity reuse | Medium |
| open conversation reuse | Silent overwrite | High |

---

## 5. Required Freezes and Guards (Design Level)

Until explicit mechanisms exist:

- Implicit customer resolution must be treated as **non-authoritative**
- Any path that resolves identity without `instructor_id` must be considered unsafe
- channel_identity_mapping must not be interpreted as customer identity
- sender_identity must remain read-only and informational only

No behavior change is defined here.  
This is a documentation and awareness step.

---

## 6. Invariants Reaffirmed

- No customer linking without instructor scope
- No silent reuse of conversations across instructors
- No implicit customer ownership derived from channel-level mappings
- No write or correction during audit or resolution

---

## 7. Acceptance Criteria (Audit Complete)

- All implicit linking paths are identified and documented
- Each path is classified as safe, unsafe, or read-only
- No fixes or refactors are proposed
- No assumptions beyond observed behavior are introduced

**Pass:** Full visibility and classification achieved  
**Fail:** Any implicit path remains undocumented

---

## 8. Outcome

CM-2.2 provides the factual baseline needed to:

- Disable unsafe assumptions mentally for the team
- Prepare CM-2.3 Safe Write Rules
- Support investor and auditor explainability

---

*End of CM-2.2 design document.*
