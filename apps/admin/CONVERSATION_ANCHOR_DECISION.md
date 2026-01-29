# Conversation Anchor Decision

**Date:** 2026-01-23

## Decision

**OPTION A** selected: Use existing `conversations` table as minimal anchor.

## Explanation

The `conversations` table (created in `001_init.sql`) serves as a minimal, stable anchor for grouping messages over time. It contains only:
- `id` (UUID, primary key)
- `created_at` (timestamp)

Channel and external_identity information lives in the `channel_identity_mapping` table (14.1.2), which provides the deterministic mapping from (channel, external_identity) → conversation_id.

This separation ensures:
- Conversation semantics are NOT embedded in the schema
- Channel identity mapping remains explicit and auditable
- The conversations table remains a pure aggregation anchor

## Invalid Migration Retirement

**14.1.4.1 migration is INVALID and RETIRED**

The migration file `packages/db/migrations/006_conversations.sql` was created but is invalid because:
- A canonical `conversations` table already exists in `001_init.sql`
- Adding channel and external_identity to conversations would duplicate data already in `channel_identity_mapping`
- The existing minimal schema is sufficient for the conversation anchor role

**No schema change was applied.** The invalid migration has been removed.

## Architectural Guarantee

Conversation semantics are NOT embedded in the database schema. The `conversations` table is a minimal anchor that:
- Groups messages over time
- Provides a stable ID for referencing
- Does NOT imply state, lifecycle, or behavior

Channel identity mapping (14.1.2) provides the deterministic link between external identities and conversation IDs.

## Change Policy

Any evolution of the conversation anchor concept requires:
- PRD update
- Scope review
- New versioned freeze marker
- Explicit approval for schema changes

No silent changes allowed.
