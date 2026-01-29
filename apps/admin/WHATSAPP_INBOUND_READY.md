# WhatsApp Inbound — READ-ONLY Contract

**Status:** FROZEN  
**Date:** 2026-01-23

## Scope

- Receive WhatsApp webhooks from Meta
- Verify webhook signature
- Store raw payload in database
- Provide admin visibility into received messages
- **NO replies, NO AI, NO automation, NO booking creation**

## What it DOES

- Accepts POST webhooks from Meta WhatsApp
- Verifies signature using HMAC-SHA256
- Stores raw payload in `whatsapp_inbound_raw` table
- Extracts sender_id and message_id from payload structure
- Returns 200 OK immediately after storage
- Provides admin UI to view received messages (received_at, sender_id, message_id, signature_valid)

## What it DOES NOT DO (NON-NEGOTIABLE)

- No replies to WhatsApp messages
- No AI calls
- No booking creation
- No conversation creation
- No automation triggers
- No message parsing or interpretation
- No payload content rendering (only metadata)
- No retries
- No background jobs
- No side effects beyond database insert
- No UPDATE or DELETE operations on stored data

## Architectural Guarantees

**Database Layer:**
- Append-only table `whatsapp_inbound_raw`
- No foreign keys
- No indexes beyond primary key
- No triggers
- No computed columns

**Repository Layer:**
- INSERT only
- No validation beyond safe optional access
- No transformation
- No try/catch (errors bubble up)

**Signature Verification:**
- Pure function (HMAC-SHA256)
- No side effects
- Deterministic
- Returns false on failure (no throwing)

**Edge Function (Webhook):**
- POST only (GET returns 405)
- Public webhook (no Supabase auth)
- Signature verification required
- Immediate 200 OK response
- No outbound messages

**Admin UI:**
- READ-ONLY table view
- No delete operations
- No retry mechanisms
- No payload parsing
- Metadata display only

## Change Policy

- Any change requires:
  - PRD update
  - Scope review
  - Versioned update to this freeze marker
- No silent changes allowed
- No mutations without explicit authorization
- No new behaviors without freeze marker update

## Final Statement

WhatsApp Inbound is frozen to preserve safety and auditability. This feature enables receiving and storing WhatsApp messages without introducing any operational risk, automation, or side effects.

**Verification:**
- ✅ Receives WhatsApp webhooks
- ✅ Verifies signatures
- ✅ Stores raw payloads
- ✅ Provides admin visibility
- ✅ Zero operational risk
- ✅ No automation
- ✅ No replies
- ✅ No AI
