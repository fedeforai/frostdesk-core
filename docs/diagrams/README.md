# FrostDesk Diagrams Index

These Mermaid diagrams are the **target specification** for booking, AI, calendar, handoff, observability, and timezone behaviour. Current code implements a subset; see "Diagram vs current code" below.

## Core

- [BOOKING_STATE_MACHINE.mmd](BOOKING_STATE_MACHINE.mmd) — Booking states and allowed transitions
- [AI_STATE_MACHINE.mmd](AI_STATE_MACHINE.mmd) — AI conversation states (ON / PAUSED_BY_HUMAN / SUGGESTION_ONLY)
- [END_TO_END_FLOW.mmd](END_TO_END_FLOW.mmd) — Conversation → draft → booking flow (AI suggests, human decides)

## Calendar (read-first)

- [CALENDAR_READ_FIRST.mmd](CALENDAR_READ_FIRST.mmd) — Availability and conflict view; no silent writes

## Referrals (manual routing)

- [HANDOFF_REFERRALS.mmd](HANDOFF_REFERRALS.mmd) — Manual handoff to trusted instructors; AI can suggest only

## Observability & timezone

- [OBSERVABILITY_DECISION_LOG.mmd](OBSERVABILITY_DECISION_LOG.mmd) — Audit for human actions and AI suggestions
- [TIMEZONE_RULES.mmd](TIMEZONE_RULES.mmd) — Store UTC; display in instructor/customer timezone

---

## Diagram vs current code

| Diagram | Status | Notes |
|--------|--------|--------|
| **BOOKING_STATE_MACHINE** | Target | Code has `draft \| proposed \| confirmed \| cancelled \| expired`. Diagram adds PENDING (= proposed), MODIFIED, DECLINED (reject + expire). DB migration `002_bookings` only allows `pending \| confirmed \| cancelled`. |
| **AI_STATE_MACHINE** | Target | No explicit AI_ON / AI_PAUSED_BY_HUMAN / AI_SUGGESTION_ONLY in DB. UI infers "paused" from timeline events. |
| **END_TO_END_FLOW** | Target | Flow matches intent. `POST /bookings/:id/accept` and `POST /bookings/:id/reject` are not implemented; admin has override-status only. |
| **CALENDAR_READ_FIRST** | Aligned | Read-first and conflict APIs exist (`availability_conflict_repository`, calendar events cache). |
| **HANDOFF_REFERRALS** | Target | Only `handoff_to_human` and resume-AI exist. No referral list or `POST /conversations/:id/handoff`. |
| **OBSERVABILITY_DECISION_LOG** | Partial | `instructor_draft_events` and booking audit exist; timeline/export API may need to be added. |
| **TIMEZONE_RULES** | Partial | DB uses `timestamptz` (UTC). Explicit "display in instructor/customer TZ" not centralized. |
