# FrostDesk v1 — Pilot Freeze

**Status:** FROZEN  
**Version:** v1.0  
**Date:** January 2026  
**Scope:** Pilot release

---

## 1. Purpose of This Freeze

This document officially freezes **FrostDesk v1** for pilot usage.

From this point forward:
- No new features are added to v1
- No behavior changes are allowed
- Only observability, UI clarity, and bug fixes are permitted

The goal of v1 is **trust, clarity, and control**, not automation.

---

## 2. What FrostDesk v1 IS

FrostDesk v1 is:

- A **conversation intelligence system**
- Designed to **assist humans**, never replace them
- Deterministic, explainable, and auditable
- Safe by default

Specifically, FrostDesk v1:
- Classifies inbound conversations
- Determines relevance and intent
- Applies confidence-based decision gating
- Optionally generates **read-only AI drafts**
- Requires human approval for all actions

---

## 3. What FrostDesk v1 IS NOT

FrostDesk v1 does NOT:

- Send messages autonomously
- Confirm bookings
- Modify bookings
- Perform background automation
- Learn or adapt automatically
- Retry, escalate, or act without explicit permission

There is **no autonomous AI behavior** in v1.

---

## 4. Core Invariants (Non-Negotiable)

The following invariants are guaranteed and must never be violated in v1:

### 4.1 Human-in-the-loop
- Every outward-facing action requires human intent

### 4.2 Deterministic behavior
- Same input always produces the same output
- No hidden state or learning

### 4.3 Idempotency
- One snapshot per message
- One draft per message (max)

### 4.4 Auditability
Every inbound message produces:
- A classification snapshot
- A confidence decision
- A permission outcome
- Optional draft metadata

All decisions are inspectable.

### 4.5 Fail-safe operation
- Webhooks never fail hard
- Errors never block message ingestion
- Draft failure never blocks snapshot persistence

---

## 5. Functional Scope (v1)

### Included
- Relevance classification
- Intent classification
- Confidence policy
- Escalation gate
- Draft generation (guarded)
- Draft quality guardrails
- Read-only admin UI
- Conversation Intelligence Program (CIP)

### Excluded
- Learning systems
- Fine-tuning
- Auto-adjusting thresholds
- Outbound automation
- Booking mutations

---

## 6. Change Policy During Pilot

Allowed changes:
- UI clarity improvements
- Observability and debug tooling
- Copy improvements
- Bug fixes with no behavior change

Not allowed:
- New AI decisions
- New automation paths
- Threshold changes without explicit review
- Schema changes without freeze break

Any change that alters system behavior requires:
- Explicit unfreeze
- Version bump (v1 → v2)

---

## 7. Ownership

- Product and Engineering jointly own v1 behavior
- No automated or silent changes are allowed

---

## 8. Statement

> **FrostDesk v1 is intentionally conservative.**  
>  
> **It prefers stopping over acting, explaining over guessing,  
> and human judgment over automation.**

---

**Freeze confirmed.**
