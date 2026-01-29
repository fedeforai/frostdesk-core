# Channel Identity Mapping — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23

## Scope

- Deterministic mapping of external channel identities to internal conversation_ids
- Table `channel_identity_mapping` stores mappings explicitly
- Repository provides SELECT, INSERT, and UPDATE (last_seen_at only)
- Service provides resolution (READ-ONLY) and creation (explicit, human-triggered)
- Admin UI provides observability of all mappings
- Edge Function provides admin resolution endpoint

## What it DOES

- Maps (channel, external_identity) → conversation_id deterministically
- Stores mappings with first_seen_at and last_seen_at timestamps
- Enforces uniqueness per (channel, external_identity)
- Provides READ-ONLY resolution service
- Provides explicit mapping creation (human-triggered only)
- Updates last_seen_at when explicitly called
- Provides admin UI to view all mappings
- Provides admin Edge Function to resolve identities

## What it DOES NOT DO (NON-NEGOTIABLE)

- No auto-create of mappings
- No auto-create of conversations
- No inference of conversation_id
- No routing logic
- No AI calls
- No automation
- No decision making
- No background jobs
- No triggers
- No foreign keys (explicitly avoided)
- No implicit updates
- No silent fallbacks
- No retries

## Architectural Guarantees

**Database Layer:**
- Table `channel_identity_mapping` with unique constraint on (channel, external_identity)
- No foreign keys
- No triggers
- No indexes beyond primary key and uniqueness constraint
- last_seen_at must be updated explicitly by application code

**Repository Layer:**
- `findChannelIdentityMapping()` — SELECT only
- `insertChannelIdentityMapping()` — INSERT only, fails on uniqueness violation
- `touchChannelIdentityMapping()` — UPDATE last_seen_at only
- No validation beyond safe optional access
- No transformations
- Errors bubble up

**Service Layer:**
- `resolveChannelIdentity()` — READ-ONLY resolution, returns mapped/unmapped status
- `createChannelIdentityMapping()` — Explicit creation, fails if mapping exists
- No auto-create
- No inference
- No routing

**Edge Functions:**
- `resolve_channel_identity` — POST-only, admin auth, READ-ONLY resolution
- `list_channel_identity_mappings` — GET-only, admin auth, returns all mappings
- No mutations
- No side effects

**Admin UI:**
- READ-ONLY table view
- Displays: channel, external_identity, conversation_id, first_seen_at, last_seen_at
- No create, edit, or delete operations
- No buttons or click handlers
- Inline warning: "OBSERVABILITY ONLY"

## Relationship to 14.1.1 (WhatsApp Inbound)

- This layer provides identity resolution for inbound messages
- It does NOT create mappings automatically from WhatsApp webhooks
- Mappings must be created explicitly by human-triggered actions
- WhatsApp inbound (14.1.1) stores raw payloads but does not create mappings

## Relationship to Future Tasks

- **14.1.3 (Inbound Message Persistence)**: Will use this mapping to resolve conversation_id
- This layer provides the deterministic foundation for message routing
- No routing logic exists yet — only the mapping infrastructure

## Change Policy

- Any change requires:
  - PRD update
  - Scope review
  - Versioned update to this freeze marker
- No silent changes allowed
- No mutations without explicit authorization
- No new behaviors without freeze marker update
- No auto-create logic without explicit approval

## Final Statement

Channel Identity Mapping is frozen to preserve determinism, auditability, and explicit control. This feature provides a deterministic mapping foundation without introducing automation, AI, or implicit behavior.

**Verification:**
- ✅ Deterministic mapping channel → conversation
- ✅ Zero automations
- ✅ Zero AI
- ✅ Zero decision making
- ✅ Maximum observability
- ✅ Perfect base for 14.1.3 Inbound Message Persistence

**Result:**
- Mapping deterministico channel → conversation
- Zero automazioni
- Zero AI
- Zero decision making
- Massima osservabilità
- Base perfetta per 14.1.3 Inbound Message Persistence
