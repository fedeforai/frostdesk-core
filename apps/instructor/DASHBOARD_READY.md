# Instructor Dashboard — READ-ONLY

Status: FROZEN  
Date: 2026-01-23

## Scope

The Instructor Dashboard is a READ-ONLY surface that aggregates all instructor operational data into a single, human-readable view.

It is intended for:
- Human orientation
- System transparency
- Trust building
- AI consumption (read-only) in future layers

It is NOT intended for:
- Data editing
- Decision making
- Automation triggering
- Booking management
- Availability modification
- Calendar control

## Included Sections

- Instructor Profile
- Services & Pricing
- Meeting Points
- Policies & Rules
- Availability
- Calendar Connection Status
- Upcoming Bookings

All sections are READ-ONLY.

## Guarantees

The dashboard guarantees:
- No mutations (no INSERT, UPDATE, DELETE)
- No business logic
- No inference
- No AI calls
- No automation triggers
- No retries
- No caching
- No side effects

All data is fetched once and rendered as-is.

## Contract

This dashboard reflects persisted system state only.

It does not:
- Resolve conflicts
- Normalize data
- Interpret availability
- Merge calendar with availability
- Predict outcomes
- Suggest actions

## Change Policy

Any change to this dashboard requires:
1. Explicit PRD update
2. Scope review
3. Manual approval
4. Versioned freeze marker update

Silent changes are forbidden.

## Usage

This dashboard can be safely used by:
- Human instructors
- Human operators
- Observability tooling
- Future AI layers as read-only context

End of contract.
