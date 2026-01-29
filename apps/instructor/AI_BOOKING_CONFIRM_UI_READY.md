# AI Booking Human Confirm — UI Contract

Status: FROZEN  
Date: 2026-01-23

## Scope
UI-only human confirmation flow for AI-generated booking drafts.

## Guarantees
- No booking creation
- No API calls
- No database writes
- No AI execution
- No automation
- No side effects

## What this UI DOES
- Forces explicit human acknowledgement
- Requires deliberate confirmation
- Shows irreversible warning

## What this UI DOES NOT DO
- Create bookings
- Validate availability
- Check calendar conflicts
- Trigger payments
- Call AI models

## Change Policy
Any change requires:
- PRD update
- Explicit scope review
- Versioned update of this file

This contract is intentionally frozen before backend wiring.
