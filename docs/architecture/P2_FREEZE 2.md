# FrostDesk — P2 Architecture Freeze

**Status:** FROZEN  
**Effective date:** 2026-02-08  
**Scope:** Core operational correctness and human-in-the-loop control

---

## Purpose

P2 establishes correctness, auditability, and human control across FrostDesk's core domains.

This phase intentionally does not optimize for growth, automation, or monetization.  
Its goal is to make every decision explicit, traceable, and reversible by humans.

Once frozen, changes to these domains require a new architectural loop.

---

## What P2 includes (FROZEN)

### 1. Booking lifecycle

- Booking is a first-class domain object.
- **Canonical states:** draft, pending, confirmed, modified, declined, cancelled.
- Transitions are:
  - Explicit
  - Human-initiated (except expiry on read)
  - Audited
- No inferred or automatic transitions.

**Reference:** docs/diagrams/BOOKING_STATE_MACHINE.mmd

### 2. AI governance

- AI suggests only.
- AI never sends messages.
- AI never performs writes.
- AI state is explicit and persisted: `ai_on`, `ai_paused_by_human`, `ai_suggestion_only`.
- AI pause triggers: manual pause in UI, human outbound sent via FrostDesk.
- No probabilistic inference from WhatsApp device replies.

**Reference:** docs/diagrams/AI_STATE_MACHINE.mmd

### 3. Calendar integration (read-first)

- Calendar is a safety layer.
- Reads events and conflicts only.
- No silent writes, no auto-sync.
- Booking confirmation remains a human action.

**Reference:** docs/diagrams/CALENDAR_READ_FIRST.mmd

### 4. Manual handoff & referrals

- Conversation ownership is explicit.
- Handoff: initiated by human, confirmed by human, audited.
- Referral list is a suggestion mechanism only.
- No auto-assign, no AI-executed routing.

**Reference:** docs/diagrams/HANDOFF_REFERRALS.mmd

### 5. Observability & decision timeline

- Every meaningful decision is replayable.
- Timeline includes: booking state changes, AI state changes, handoffs, messages (inbound/outbound).
- Timeline is read-only; no synthetic or inferred events.

**Reference:** docs/diagrams/OBSERVABILITY_DECISION_LOG.mmd

### 6. Timezone rules

- DB timestamps stored in UTC only.
- Instructor UI displays instructor timezone.
- Customer-facing messages use customer timezone if known, else instructor timezone.

**Reference:** docs/diagrams/TIMEZONE_RULES.mmd

---

## Explicit non-goals (P2)

The following are **out of scope** for P2 and must not be implemented without a new loop:

- Automatic booking confirmation
- Payment logic or payment states
- Calendar write-back or sync
- Background workers or cron jobs
- AI-executed actions
- Heuristic or inferred state transitions
- Growth features, pricing, analytics

---

## Change policy

**P2 is frozen.**

Any change to the above domains requires:

1. A new loop proposal
2. Diagram updates
3. Explicit approval

This document is the guardrail for future development.

---

## Why this matters

P2 creates a system that:

- Scales without losing trust
- Can be audited and explained
- Keeps humans accountable
- Avoids silent failure modes

**Growth comes later.**  
**Correctness comes first.**

---

*END OF FILE*
