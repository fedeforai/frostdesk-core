# Conversation Surfacing — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23  
**Block:** 14.1.4

---

## Scope

BLOCK 14.1.4 — Conversation Surfacing provides READ-ONLY observability for conversation timelines by JOINING existing tables (conversations, channel_identity_mapping, inbound_messages).

This block enables humans (and future AI) to see the complete history of a conversation without interpretation, mutations, or side effects.

**Note:** Task 14.1.4.1 (Conversation Table migration) was INVALID and RETIRED. The existing minimal `conversations` table from `001_init.sql` serves as the conversation anchor. See `CONVERSATION_ANCHOR_DECISION.md` for details.

---

## What it DOES

- **Surfaces conversation timelines** by JOINING:
  - `conversations` (minimal anchor)
  - `channel_identity_mapping` (channel + external_identity)
  - `inbound_messages` (message timeline)
- **Returns deterministic timeline DTO** with:
  - Conversation metadata (conversation_id, channel, external_identity)
  - Messages ordered chronologically (received_at ASC)
- **Enables audit and observability** via Admin UI
- **READ-ONLY across all layers:**
  - Service: SELECT-only SQL JOINs
  - Edge Function: GET-only, no mutations
  - Admin UI: OBSERVABILITY ONLY, no actions

---

## What it DOES NOT DO (NON-NEGOTIABLE)

- **No conversation creation**
- **No routing logic**
- **No replies or outbound messages**
- **No AI calls**
- **No automation**
- **No state inference**
- **No lifecycle management**
- **No decision making**
- **No mutations** (INSERT, UPDATE, DELETE)
- **No side effects**
- **No triggers or background jobs**
- **No schema changes** (no new tables, no ALTER TABLE)

---

## Architectural Guarantees

### Database Layer
- **No new tables created** (14.1.4.1 was RETIRED)
- **No triggers**
- **No foreign keys added**
- **No indexes beyond existing**
- Uses existing minimal `conversations` table as anchor

### Repository/Service Layer
- **SELECT-only operations**
- **SQL JOINs** (conversations, channel_identity_mapping, inbound_messages)
- **Deterministic output** (same input → same output)
- **No business logic**
- **No state derivation**

### Edge Function Layer
- **GET-only endpoint** (`/admin/conversation_timeline`)
- **Admin authentication required**
- **No mutations**
- **No side effects**
- **Returns raw timeline DTO**

### Admin UI Layer
- **Server Component** (async data fetching)
- **READ-ONLY presentation**
- **No buttons or actions**
- **No input fields**
- **Explicit "READ-ONLY / OBSERVABILITY" warning**
- **Clear empty state** if no messages

---

## Relationship to Other Blocks

### Depends On
- **14.1.1 — WhatsApp Inbound (FROZEN)**
  - Provides raw inbound message ingestion
  - No replies, no AI, no automation
- **14.1.2 — Channel Identity Mapping (FROZEN)**
  - Provides deterministic mapping: (channel, external_identity) → conversation_id
  - No auto-creation, explicit human-triggered only
- **14.1.3 — Inbound Message Persistence (FROZEN)**
  - Provides normalized inbound_messages table
  - Append-only, no routing, no automation

### Prepares For (NOT IMPLEMENTED)
- Future routing blocks (explicitly out of scope)
- Future conversation lifecycle management (explicitly out of scope)
- Future reply/outbound message handling (explicitly out of scope)

---

## Change Policy

**NO changes are allowed without:**
1. **PRD update** documenting the change rationale
2. **Scope review** confirming the change does not violate safety guarantees
3. **New versioned freeze marker** replacing this document

**Explicitly forbidden:**
- Silent changes
- Scope creep
- Mutation introduction
- Automation introduction
- AI introduction

---

## Verification Checklist

✅ **Deterministic timeline rendering**
- Same conversation_id → same timeline output
- Messages ordered by received_at ASC
- No random ordering or filtering

✅ **Zero mutations**
- No INSERT, UPDATE, DELETE
- No conversation creation
- No mapping creation
- No message creation

✅ **Zero automation**
- No background jobs
- No triggers
- No scheduled tasks
- No implicit behavior

✅ **Zero AI**
- No AI calls
- No inference
- No decision making
- No state derivation

✅ **Full observability**
- Complete message history visible
- Chronological ordering preserved
- Raw data displayed (no interpretation)
- Admin UI accessible and functional

✅ **Pilot-safe**
- No risk to production data
- No side effects
- No hidden behavior
- Fully auditable

---

## Final Statement

BLOCK 14.1.4 — Conversation Surfacing is **FROZEN** to preserve:

1. **Observability:** Humans can inspect complete conversation timelines without ambiguity
2. **Safety:** Zero mutations, zero automation, zero AI
3. **Auditability:** Every message is traceable and chronological
4. **Determinism:** Same input always produces same output
5. **Reversibility:** No state changes means no rollback risk

This block is **production-grade** and **pilot-safe**. It provides essential observability infrastructure for future routing and handling blocks, while maintaining absolute safety guarantees.

**Status:** FROZEN  
**Date:** 2026-01-23  
**Version:** 1.0
