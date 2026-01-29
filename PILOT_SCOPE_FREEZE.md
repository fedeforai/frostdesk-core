# PILOT_SCOPE_FREEZE.md

**Status**: Frozen

Pilot scope formally defined and closed.

**Effective Date**: 2026-01-24

## 1. Enabled Channels

- WhatsApp inbound via Meta webhook
- Internal Admin Web UI
- Internal Human Inbox interface

**No other channels are enabled.**

## 2. Enabled Functional Capabilities

- Inbound message reception from real users
- Message persistence with idempotency guarantees
- Conversation state tracking
- Read-only booking lifecycle visibility
- Human Inbox message listing
- Human Inbox message detail view
- AI intent classification in read-only mode
- AI confidence telemetry logging
- AI eligibility evaluation
- AI escalation classification
- AI decision snapshot generation
- AI draft response generation
- Human approval of AI-generated drafts
- Manual human sending of approved messages
- System health snapshot visibility
- System degradation snapshot visibility

## 3. Human Roles in Pilot

- System Administrator
- Human Operator
- Human Approver

**No other roles exist within the pilot.**

## 4. Permitted AI Capabilities

- Intent classification on inbound messages
- Confidence scoring of classified intent
- Eligibility evaluation based on deterministic rules
- Escalation classification
- Draft response generation
- Explanation generation for non-response decisions
- Telemetry emission for observability

**All AI operations are read-only or draft-only.**

## 5. Permitted Message Types

- General customer inquiries
- Availability questions
- Pricing questions
- Policy clarification requests
- Booking information requests

**Message handling remains informational only.**

## 6. Visible Booking States

- Inquiry received
- Booking draft visible
- Booking pending human confirmation
- Booking confirmed by human
- Booking cancelled by human

**No automated transitions are permitted.**

## 7. Explicit Scope Constraints

- **No autonomous AI replies**
- **No automated booking creation**
- **No automated booking modification**
- **No automated payments**
- **No background jobs with side effects**
- **No external system write operations**

## 8. Scope Lock

**This scope is closed and immutable for the duration of the pilot.**

Any change requires a new governance block and explicit approval.
