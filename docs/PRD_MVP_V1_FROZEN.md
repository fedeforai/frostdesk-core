# FrostDesk MVP v1 – Product Requirements Document (FROZEN)

**Product name:** FrostDesk  
**Version:** MVP v1 (Frozen)  
**Status:** Market-ready pilot  
**Paradigm:** Manual-first, human-in-the-loop WhatsApp assistant for ski instructors

---

## 1. Product Overview

FrostDesk MVP v1 is a deterministic, auditable WhatsApp assistant designed to support ski instructors in managing inbound customer conversations. The system prioritizes human control at every stage, using AI strictly as a classification and drafting assistant, never as an autonomous decision-maker.

This MVP is intentionally constrained. Its goal is not automation at scale, but operational reliability, zero missed messages, and full human oversight.

---

## 2. Target Users

**Primary user:** Ski instructors or ski schools using WhatsApp as their primary customer communication channel.

**Internal user:** Human operators or admins handling conversations, approvals, and replies via the FrostDesk admin interface.

---

## 3. Core Principles

- **Human-first** — Humans always have final control. AI never sends messages autonomously.
- **No silent decisions** — Every AI action is observable and auditable. No hidden state or implicit automation.
- **Manual before automatic** — Automation is deferred until behavior is proven in real usage.
- **Truthful UI** — The interface only displays data that truly exists in the system. No inferred or simulated decisions are shown as facts.

---

## 4. In-Scope Functionality (MVP v1)

### 4.1 Inbound WhatsApp Handling

- Real WhatsApp inbound messages received via Meta webhook.
- Messages are: validated, persisted atomically, idempotent on external_message_id.
- Conversations are resolved or created via channel and customer identity mapping.

### 4.2 Conversation Persistence and Ownership

- Each conversation is uniquely owned and persisted.
- Conversations track: instructor, channel, customer identifier, status (open, requires_human, closed).

### 4.3 AI Classification and Drafting

- For each inbound message, AI performs: relevance classification, intent detection, confidence scoring.
- AI snapshots are stored per message for audit.
- AI may generate a draft reply, but: drafts are never sent automatically; drafts require explicit human approval.

### 4.4 Human Escalation Visibility

- Conversations are flagged as needing human attention when: booking-related intent is detected, confidence is below threshold.
- Escalation is visible in the admin inbox.
- Escalation logic is derived, not manually toggled.

### 4.5 Admin Interface

Admins can:

- View inbound conversations
- Read full message history
- See AI classification data
- Review AI-generated drafts
- Approve and send drafts
- Send fully manual replies

### 4.6 Manual Message Delivery

- Approved drafts or manual replies are sent via WhatsApp Cloud API.
- All outbound messages are persisted and auditable.

---

## 5. Explicitly Out of Scope (MVP v1)

The following are intentionally excluded:

- Calendar automation
- Booking creation or confirmation
- Instructor-facing UI
- Automatic AI replies
- State machine driven conversation flow
- Delivery and read receipts
- Metrics dashboards
- Structured logging pipelines
- AI-driven booking decisions
- Any form of autonomous closing

These exclusions are deliberate to preserve system integrity during early usage.

---

## 6. Data and Auditability

**Persisted data includes:**

- Raw inbound messages
- Normalized messages
- AI snapshots per message
- Outbound messages

**Guarantees:**

- Full traceability of every AI action
- Idempotent inbound handling
- No message is processed without persistence

---

## 7. Error Handling and Safety

- Invariant violations fail fast.
- Invalid conversation resolution halts processing before persistence.
- Errors return deterministic codes suitable for audit.

---

## 8. UX Guarantees

- Admin UI never displays inferred decisions.
- Only real, persisted data is shown.
- Human actions are always explicit.

---

## 9. Success Criteria for MVP v1

The MVP is considered successful if:

- Real WhatsApp conversations can be handled end-to-end.
- Humans can intervene at any time.
- AI assists without acting autonomously.
- No inbound message is lost or silently mishandled.
- The system can be explained clearly to an external reviewer.

---

## 10. Known Limitations

- No automation beyond drafting.
- No performance or conversion metrics.
- No booking lifecycle management.
- No instructor self-service.

These are not bugs. They are boundaries.

---

## 11. Next Phase Direction (Non-binding)

Future iterations may explore:

- Conversation state machines
- Booking workflows
- Calendar integration
- Advanced governance
- Instructor UX

These are explicitly deferred until MVP behavior is validated in real usage.

---

## 12. Final Statement

> **FrostDesk MVP v1 is not a demo.**  
> It is a controlled operational system designed to learn from reality before scaling.
>
> **This document reflects the system exactly as it exists today.**
