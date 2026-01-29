# Inbound Message Persistence — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23

## Scope

BLOCK 14.1.3 — Inbound Message Persistence provides deterministic, append-only persistence of inbound messages from external channels (e.g., WhatsApp) into a normalized, readable format.

This block exists to:
- Persist inbound messages in a structured, queryable form
- Link messages to existing conversations via channel identity mapping
- Preserve raw payloads for audit and debugging
- Enable full observability of inbound message flow
- Provide foundation for future message handling (not implemented in this block)

## What it DOES

- Persists inbound messages in readable, normalized form (`inbound_messages` table)
- Links messages to EXISTING conversation_id (via channel identity mapping)
- Preserves original raw payload for audit trail
- Enables chronological inspection of messages per conversation
- Provides idempotent persistence (checks for existing messages)
- Integrates with WhatsApp inbound webhook (14.1.1)
- Uses channel identity mapping (14.1.2) to resolve conversation_id
- Provides Admin UI for READ-ONLY message inspection
- Returns 200 OK immediately after persistence (idempotent)

## What it DOES NOT DO (NON-NEGOTIABLE)

- No routing logic
- No replies to messages
- No message generation
- No AI calls
- No automation
- No conversation creation
- No identity mapping creation
- No decision making
- No message processing
- No background jobs
- No retries
- No side effects beyond database INSERT

## Architectural Guarantees

**Database Layer:**
- Table `inbound_messages` with UNIQUE constraint on (channel, external_message_id)
- Append-only design (no UPDATE or DELETE operations)
- No foreign keys
- No triggers
- No indexes beyond primary key and uniqueness constraint
- conversation_id must already exist (not validated by table)

**Repository Layer:**
- `insertInboundMessage()` — INSERT only, throws on uniqueness violation
- `findInboundMessageByExternalId()` — SELECT only, for idempotency checks
- `listInboundMessagesByConversation()` — SELECT only, chronological order
- No validation beyond safe optional access
- No transformations
- Errors bubble up

**Service Layer:**
- `persistInboundMessage()` — Explicit idempotency check, INSERT only
- Returns deterministic result: "inserted" or "already_exists"
- No routing logic
- No message processing
- No side effects beyond DB INSERT

**Edge Function Integration:**
- WhatsApp inbound webhook resolves channel identity
- If unmapped → returns 200 OK (does not persist)
- If mapped → persists message via service
- No replies, no routing, no automation

**Admin UI:**
- READ-ONLY table view
- Displays: channel, conversation_id, external_message_id, sender_identity, message_type, message_text, received_at, created_at
- raw_payload NOT rendered (preserved but hidden)
- No create, edit, delete, resend, or reply operations
- No buttons or click handlers
- Inline warning: "READ-ONLY / OBSERVABILITY"

## Relationship to Other Blocks

**Depends on:**
- **14.1.1 (WhatsApp Inbound RAW)**: Receives and stores raw webhook payloads
- **14.1.2 (Channel Identity Mapping)**: Resolves (channel, external_identity) → conversation_id

**Integration:**
- WhatsApp inbound webhook (14.1.1) calls channel identity resolver (14.1.2)
- If identity is mapped → persists message via persistence service (14.1.3)
- If identity is unmapped → returns 200 OK without persistence

**Prepares for (future, not in scope):**
- **14.1.4+**: Future routing, message handling, or reply logic
- This block provides the persistence foundation only

## Change Policy

- Any change requires:
  - PRD update
  - Scope review
  - Versioned update to this freeze marker
- No silent changes allowed
- No mutations without explicit authorization
- No new behaviors without freeze marker update
- No routing or processing logic without explicit approval

## Verification Checklist

- ✅ Deterministic persistence (same input → same result)
- ✅ Idempotent behavior (duplicate messages handled gracefully)
- ✅ Zero automation (no background jobs, no triggers)
- ✅ Zero AI (no AI calls, no inference)
- ✅ Full observability (Admin UI shows all persisted messages)
- ✅ Pilot-safe (no operational risk, no side effects)
- ✅ Append-only (no UPDATE or DELETE operations)
- ✅ Explicit identity resolution (no auto-creation of mappings)

## Final Statement

Inbound Message Persistence is frozen to preserve determinism, auditability, and explicit control. This feature provides a deterministic persistence foundation for inbound messages without introducing routing, replies, AI, or automation.

The block is production-grade and ready for:
- Receiving and persisting real WhatsApp messages
- Observing message flow via Admin UI
- Serving as foundation for future message handling features
- Demonstrating end-to-end message persistence flow

**Verification:**
- ✅ Deterministic persistence
- ✅ Idempotent behavior
- ✅ Zero automation
- ✅ Zero AI
- ✅ Full observability
- ✅ Pilot-safe
