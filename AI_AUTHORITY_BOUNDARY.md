# AI_AUTHORITY_BOUNDARY.md

**Status**: Frozen

AI authority boundaries formally defined and binding.

**Effective Date**: 2026-01-24

## 1. Canonical Principle

**AI has no autonomous authority.**

The AI component of FrostDesk does not possess decision-making power, execution authority, or agency of any kind.

## 2. Permitted AI Capabilities

The AI is strictly limited to the following actions:

- Classify intent of inbound messages
- Generate confidence scores for classified intent
- Evaluate eligibility using deterministic rules
- Classify escalation requirements
- Generate draft responses
- Generate explanations for non-response decisions
- Emit telemetry and observability signals

**All permitted capabilities are read-only or draft-only.**

## 3. Prohibited AI Capabilities

The AI is explicitly prohibited from:

- Sending messages to users
- Creating, modifying, or cancelling bookings
- Initiating or confirming payments
- Writing to calendars or external systems
- Executing background tasks
- Triggering automated workflows
- Mutating system state beyond draft generation
- Performing irreversible actions

## 4. Actions Requiring Explicit Human Approval

The following actions may only occur after explicit human approval:

- Sending any message to a user
- Confirming booking information
- Communicating availability or pricing
- Responding to policy-related inquiries
- Progressing any booking state

**Approval must be intentional, logged, and attributable to a human role.**

## 5. Actions That May Never Occur

The following actions are forbidden under all circumstances:

- Autonomous AI outbound communication
- Autonomous booking creation or confirmation
- Autonomous payment handling
- Autonomous system configuration changes
- Autonomous exception handling or rule overrides

**No emergency, edge case, or optimization justifies these actions.**

## 6. Determinism Requirement

**For identical inputs, the AI must produce identical outputs.**

No implicit inference, adaptive behavior, or probabilistic override is permitted.

## 7. Auditability and Attribution

- Every AI output must be traceable
- Every AI decision must be explainable
- Every blocked action must produce a reasoned snapshot
- Every human approval must be attributable

**No silent AI behavior is permitted.**

## 8. Boundary Enforcement

- Boundary violations invalidate pilot conditions
- Violations require immediate AI shutdown
- No temporary boundary exceptions are allowed
- Boundaries apply in all environments, including development

## 9. Boundary Lock

**This authority boundary is final and immutable for the duration of the pilot.**

Any change requires a new governance block and explicit approval.
