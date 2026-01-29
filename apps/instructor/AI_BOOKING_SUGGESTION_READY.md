# AI Booking Suggestion Layer — READ-ONLY Contract

Status: FROZEN  
Date: 2026-01-23

---

## Scope

This document freezes the AI Booking Suggestion layer in its **READ-ONLY CONTEXT ONLY** form.

This layer:

- Exposes availability windows
- Exposes calendar busy slots (cached)
- Exposes recent booking history
- Exists for human inspection and future AI consumption

This layer does NOT:

- Generate suggestions
- Make decisions
- Perform actions
- Modify state

---

## Explicit Capabilities (What It DOES)

- READ availability windows
- READ busy time ranges
- READ recent booking history
- Provide context only

No verbs implying action.

---

## Explicit Non-Capabilities (What It DOES NOT DO)

This section explicitly lists what this layer **DOES NOT DO**:

- ❌ Generate booking suggestions
- ❌ Rank time slots
- ❌ Filter availability
- ❌ Merge availability + calendar
- ❌ Resolve conflicts
- ❌ Recommend times
- ❌ Create bookings
- ❌ Modify availability
- ❌ Trigger automations
- ❌ Call AI models
- ❌ Produce explanations
- ❌ Add confidence scores
- ❌ Add metadata or flags

This list is non-negotiable.

---

## AI Safety Declaration

This section declares clearly:

- AI may read this context
- AI may not act on this context
- AI may not modify any state
- AI may not create bookings
- AI may not infer availability
- AI may not normalize or reinterpret data

This is the AI permission boundary.

---

## Architectural Guarantees

This layer guarantees:

- READ-ONLY queries only
- No mutations at any layer
- No business logic
- No inference
- No retries
- No caching
- No side effects
- Deterministic output

---

## Relationship to Booking Engine

This section explicitly states:

- This layer does not create bookings
- This layer does not validate bookings
- This layer does not replace human decision
- This layer is upstream-only from booking creation

---

## Change Policy

Any modification requires:

1. PRD update
2. Explicit scope review
3. Manual approval
4. Versioned update of this file

No silent changes allowed.

---

## Final Statement

This layer is frozen to guarantee explainability, reversibility, and safety.
Any AI behavior built on top of this context must be optional, inspectable, and interruptible.
