# KILL_SWITCH_GOVERNANCE.md

**Status**: Frozen

Kill switch governance formally defined and binding.

**Effective Date**: 2026-01-24

## 1. Canonical Principle

**System safety overrides all functionality.**

Any kill switch activation takes immediate precedence over business logic, AI logic, and user workflows.

## 2. Existing Kill Switches

### 2.1 Environment-Level Kill Switch

**Identifier**

`AI_EMERGENCY_DISABLE`

**Scope**

Global

**Effect**

- Immediately disables all AI processing
- Blocks intent classification
- Blocks eligibility evaluation
- Blocks draft generation
- Preserves message reception and human operations

**Characteristics**

- Highest priority
- Cannot be overridden by code or database state
- Effective across all environments

### 2.2 Database Feature Flags

**Identifiers**

- `ai_enabled`
- `ai_whatsapp_enabled`

**Scope**

- Per system
- Per channel

**Effect**

- Disables AI execution at runtime
- Prevents AI draft generation
- Forces manual-only handling

**Characteristics**

- Secondary priority
- Read at execution time
- Logged and auditable

### 2.3 Quota-Based Throttling

**Scope**

- Per channel
- Per time window

**Effect**

- Temporarily disables AI processing when thresholds are exceeded
- Forces escalation to human-only handling

**Characteristics**

- Soft enforcement
- Non-destructive
- Does not alter system configuration

### 2.4 Eligibility Enforcement

**Scope**

- Per conversation
- Per message

**Effect**

- Prevents AI draft generation when eligibility rules fail
- Generates decision snapshot explaining non-response

**Characteristics**

- Lowest priority
- Deterministic
- Fully auditable

## 3. Order of Precedence

Kill switches are evaluated in the following strict order:

1. Environment-level kill switch
2. Database feature flags
3. Quota enforcement
4. Eligibility evaluation

**Higher-priority switches always override lower-priority logic.**

## 4. Immediate Effects of Activation

Upon activation of any kill switch:

- All AI execution stops immediately
- No in-flight AI actions are completed
- No automated retries occur
- Human operations remain available
- Audit logs remain intact and accessible

## 5. Persistent Effects

- Kill switch state persists until explicitly reverted
- No automatic rollback is permitted
- System does not self-heal or re-enable AI
- Manual intervention is required for reactivation

## 6. Override Rules

- Only System Administrator may activate or deactivate kill switches
- Overrides must be intentional and logged
- No emergency exception bypass is permitted
- No code path may ignore kill switch state

## 7. Audit and Accountability

- Every activation is logged with timestamp and actor
- Every deactivation is logged with justification
- Kill switch history must be preserved
- Missing logs invalidate pilot conditions

## 8. Governance Lock

**Kill switch behavior is final and immutable for the duration of the pilot.**

Any modification requires a new governance block and explicit approval.
