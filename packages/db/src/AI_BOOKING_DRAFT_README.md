# AI Booking Draft — READ-ONLY Contract

Status: ACTIVE  
Scope: Ephemeral, non-persisted booking proposal

## What this IS
- A structured, in-memory representation of a possible booking
- Designed to be reviewed by a human
- Input for UI preview only

## What this IS NOT
- ❌ A booking
- ❌ A reservation
- ❌ A persisted record
- ❌ A decision
- ❌ An automation

## Guarantees
- No database writes
- No calendar interaction
- No availability enforcement
- No AI autonomy
- No retries
- No side effects

## Usage
- Created only in-memory
- Passed to UI for review
- Requires explicit human confirmation before any booking creation

## Change policy
Any change requires:
- PRD update
- Explicit scope review
- Manual approval
