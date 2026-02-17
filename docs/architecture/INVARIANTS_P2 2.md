# FrostDesk P2 — Architecture Invariants

This document defines the non-negotiable invariants for FrostDesk P2.
All diagrams, code changes, and Cursor prompts must comply with these rules.

## Core invariants

1. **AI suggests, human decides**
   - AI never sends messages
   - AI never confirms bookings
   - AI never changes ownership

2. **No background workers**
   - No cron jobs
   - No schedulers
   - Time-based logic must be evaluated on access or action

3. **No silent automation**
   - No auto-confirmation
   - No automatic calendar writes
   - No automatic handoff or reassignment

4. **Draft ≠ Booking**
   - Proposals and alternatives live at draft level
   - Bookings represent operational truth only

5. **Booking state transitions are explicit and auditable**
   - Every transition is human- or system-triggered
   - Every transition is logged

6. **Calendar is a safety layer, not an automation engine**
   - Read-first only
   - Conflicts are surfaced, never auto-resolved

7. **Time handling**
   - Database timestamps are stored in UTC
   - Display and messaging apply timezone rules

## Naming conventions

- Diagram state names may appear in uppercase (e.g. CONFIRMED)
- Code and database state values use lowercase (e.g. confirmed)

This mapping is intentional and explicit.
