# CM-1 — Customer Identifier Model: Design & Audit

**Status:** Design only. No code, no migrations, no changes to existing files.  
**Reference:** STEP 9 (Billing & Pricing), Customer Memory ticket breakdown (CM-1).  
**Principle:** Instructor-scoped, stable identity; no silent duplicates; human-in-control.

---

## 1. Current-state audit

### 1.1 Where customer-like identifiers already exist

| Location | What exists | Scope / uniqueness |
|----------|-------------|---------------------|
| **conversations** | Column `customer_identifier` (TEXT). Set at conversation creation. | One value per conversation. No unique constraint. No formal normalization. |
| **channel_identity_mapping** | Columns `channel`, `customer_identifier`, `conversation_id`. Constraint `UNIQUE (channel, customer_identifier)`. | Global per channel: one (channel, customer_identifier) maps to one conversation_id. Not scoped by instructor. |
| **inbound_messages** | Column `sender_identity` (TEXT). Per message. | Append-only. Used as fallback when conversation has no customer_identifier (e.g. WhatsApp target resolution). |
| **Webhook ingestion** | WhatsApp `message.from` used as sender/customer identifier. Passed to `resolveConversationByChannel('whatsapp', sender_identifier, instructorId)`. | Identifier is raw “from” (no E.164 or other normalization at persistence). |

### 1.2 Files and ingestion points involved

- **packages/db**
  - `conversation_repository.ts`: `createConversation`, `getConversationById`, `getOpenConversationByCustomer`, `resolveConversationByChannel`. Uses `customer_identifier` on conversations; no normalization.
  - `channel_identity_mapping_repository.ts`: `findChannelIdentityMapping`, `insertChannelIdentityMapping`. Key: `(channel, customer_identifier)`; `ON CONFLICT DO NOTHING`.
  - `conversation_service.ts`: `resolveConversationForInboundMessage` — uses `getOpenConversationByCustomer(customerIdentifier)` then `createConversation`; no channel in lookup.
  - `inbound_messages_repository.ts`: `sender_identity` on each row; `getLatestInboundSenderIdentityByConversationId` for fallback.
- **apps/api**
  - `routes/webhook_whatsapp.ts`: Normalizes `message.from` to `sender_identifier`, calls `resolveConversationByChannel('whatsapp', sender_identifier, 1)`.
  - `integrations/whatsapp_target_resolution.ts`: Resolves target phone from `conversation.customer_identifier` then fallback to latest `sender_identity`; normalizes to digits-only for API (no DB normalization).
- **Migrations**
  - `001_init.sql`: conversations (id, created_at only originally).
  - `20260124000001_align_conversations_schema.sql`: Adds `instructor_id`, `channel`, `status`, `updated_at`, `customer_identifier`.
  - `004_channel_identity_mapping.sql` / `009_channel_identity_mapping_v2.sql`: channel_identity_mapping with `UNIQUE (channel, customer_identifier)` and FK to conversations.

### 1.3 What already exists vs what does not

| Exists | Does not exist |
|--------|-----------------|
| Conversation-level `customer_identifier` (text, not normalized). | Dedicated **customers** (or customer_profiles) table. |
| Mapping (channel, customer_identifier) → conversation_id, unique per channel. | Unique constraint on **instructor + normalized identifier**. |
| Sender identity per inbound message; fallback for target resolution. | Single canonical **customer** entity shared across conversations of one instructor. |
| Instructor on conversation (`instructor_id`). | Instructor scope on **channel_identity_mapping** (mapping is global per channel). |
| Resolution path: channel + identifier → mapping → or create conversation + insert mapping. | Normalization rule for identifiers (e.g. E.164, lowercased) before storage or lookup. |
| | Audit of “who linked which conversation to which customer”. |

### 1.4 Critical gap: instructor scope on identity

- `getOpenConversationByCustomer(customerIdentifier)` selects by `customer_identifier` only. It does **not** filter by `instructor_id`. So the same identifier can match a conversation belonging to another instructor (data leakage risk if multiple instructors share the same channel or resolution path).
- `channel_identity_mapping` has no `instructor_id`. Uniqueness is `(channel, customer_identifier)` globally. So one phone number on WhatsApp can only map to one conversation in the system, regardless of instructor. For a single-tenant or single-instructor-per-phone setup this may hold; for multi-instructor it does not.

---

## 2. Proposed data model (design only)

### 2.1 Table: customers (new)

- **Purpose:** One row per distinct customer **per instructor**. Stable identity key: instructor + normalized channel identifier.
- **Proposed name:** `customers` (or `customer_profiles` if name clash with existing docs).
- **Key fields (design only):**
  - `id` (UUID, PK).
  - `instructor_id` (UUID, NOT NULL). FK to instructor_profiles(id) or equivalent. Ownership.
  - `channel` (TEXT, NOT NULL). e.g. `'whatsapp'`.
  - `normalized_identifier` (TEXT, NOT NULL). Canonical form for matching (e.g. digits-only for phone; one consistent rule).
  - `display_identifier` (TEXT, nullable). Optional human-readable form; not used for matching.
  - `created_at`, `updated_at` (TIMESTAMPTZ).
- **Constraints:**
  - `UNIQUE (instructor_id, channel, normalized_identifier)` — same instructor + channel + normalized id → one customer. Prevents silent duplicates.
  - No unique on identifier alone: different instructors can have different customers with the same phone (e.g. two instructors, same client).
- **Ownership:** Every row is instructor-scoped. RLS and all queries must filter by `instructor_id` where applicable.

### 2.2 Relation: conversation ↔ customer

- **Option A (conversation points to customer):** Add `customer_id` (UUID, nullable) on `conversations`, FK to `customers(id)`. One conversation has 0 or 1 customer. Optional for backward compatibility during rollout.
- **Option B (keep identifier on conversation):** Keep `conversations.customer_identifier` and derive customer from (instructor_id, channel, normalized(customer_identifier)) when needed. No new FK; customers table is a cache/dedup layer keyed by (instructor_id, channel, normalized_identifier).

Design choice is left open; both preserve “one customer per (instructor, channel, normalized id)”.

### 2.3 Normalization strategy for identifiers

- **Rule:** One deterministic function: raw input (e.g. WhatsApp `from`) → `normalized_identifier`. Same input always yields same output.
- **Example (phone):** Strip non-digits; optionally enforce min length (e.g. 10); no leading + in stored value. Applied at creation and at lookup so that “+39 333 1234567” and “393331234567” resolve to the same customer.
- **Scope:** Applied when creating or resolving a customer; not required to backfill existing `conversations.customer_identifier` in this design phase.
- **Append-only vs mutable:** Customer row is created once per (instructor_id, channel, normalized_identifier). `display_identifier` or other non-key fields can be updated; the unique key (instructor_id, channel, normalized_identifier) is immutable for the lifetime of the row.

### 2.4 What is append-only vs mutable

- **Append-only:** Inbound messages (existing); audit events for linking (if added in CM-2). Customer row is created once; no “merge” or “delete then recreate” of the same key.
- **Mutable:** Customer row’s non-key fields (e.g. display_identifier, updated_at). Conversation’s `customer_id` (if added) or `customer_identifier` when linking is updated by human or by deterministic resolution.

---

## 3. Linking strategy (high level)

### 3.1 How a conversation is linked to a customer

1. **Ingestion:** Inbound message arrives with raw sender id (e.g. WhatsApp `from`).
2. **Normalize:** Compute `normalized_identifier` from raw id using the single agreed rule.
3. **Resolve customer:** Look up customer by (instructor_id, channel, normalized_identifier). If found, use that customer_id (or that identity). If not found, create one row in `customers` with that key (and optionally display_identifier = raw).
4. **Conversation:** Either (a) resolve conversation via existing (channel, customer_identifier) mapping and then set conversation.customer_id = customer.id, or (b) keep using customer_identifier on conversation and ensure it is set from the same normalized value so that conversation and customer stay aligned. No overwrite of a different instructor’s data.

### 3.2 How ambiguity is handled

- **Same number, two instructors:** Two separate customer rows (different instructor_id). No shared customer entity across instructors.
- **Two raw ids that normalize to the same value:** One customer per (instructor_id, channel, normalized_identifier). First write wins; later messages with same normalized id attach to same customer.
- **Ambiguous or unparseable identifier:** No automatic merge. Fallback: leave conversation without a linked customer (customer_id = null or customer_identifier = null); optionally flag for human review. Human can later assign or correct (CM-2 “fallback manuale”).

### 3.3 If the identifier changes

- **Same person, new number:** New normalized id → new customer row unless product decides to support “merge” (out of scope for CM-1). So: new number = new customer; no silent merge.
- **Correction by human:** Handled in CM-2 (manual linking); CM-1 only defines the stable key and no automatic overwrite of links.

---

## 4. Safety and invariants

### 4.1 Invariants that must never be broken

- **Instructor scope:** A customer row belongs to exactly one instructor. No customer shared across instructors. All lookups that return customers must be filtered by instructor_id (or by conversation’s instructor_id when deriving from conversation).
- **Uniqueness:** At most one customer per (instructor_id, channel, normalized_identifier). No duplicate rows for the same key.
- **No silent overwrite:** Linking a conversation to a customer must not overwrite another instructor’s mapping or customer. Updates to conversation.customer_id or customer_identifier must be within the same instructor’s data.
- **Determinism:** Normalization is a pure function. Same raw id → same normalized_identifier every time.

### 4.2 Failure modes and safe fallbacks

- **Normalization produces empty or invalid:** Do not create a customer; do not link. Conversation can exist without customer_id; UI can show “unknown” or “unlinked”. No crash, no wrong link.
- **DB constraint violation on insert (e.g. duplicate key):** Treat as “customer already exists”; use existing row for linking. No overwrite of existing row’s key.
- **Missing instructor_id in context:** Do not create or resolve customer. Fail the operation or leave conversation unlinked; do not guess instructor.

### 4.3 What the system must NOT do

- No automatic merge of two customer rows (e.g. “same person” by heuristic). Human-only if ever.
- No cross-instructor visibility: never return or link to a customer that belongs to another instructor.
- No use of unnormalized identifier as unique key: duplicates possible (e.g. “3331234567” vs “+39 333 1234567”).
- No deletion of customer row if it would orphan conversations; either soft-delete or forbid delete while linked (design choice left to implementation).

---

## 5. Performance considerations

### 5.1 Required indexes

- **customers:** Unique constraint on (instructor_id, channel, normalized_identifier) implies an index; sufficient for lookup and insert. Optional: index on instructor_id alone for “all customers of instructor” if needed by UI.
- **conversations:** If `customer_id` is added: index on (customer_id) for “conversations by customer”. Existing indexes on instructor_id, created_at remain relevant.

### 5.2 Expected query patterns

- **Ingestion:** Lookup customer by (instructor_id, channel, normalized_identifier); then by (channel, customer_identifier) or (channel, normalized_identifier) for conversation resolution. Single row read; then conversation create or update. No N+1 if one message → one lookup.
- **UI “conversations for customer”:** List conversations where customer_id = X (and instructor scoped). Index on customer_id.
- **UI “customer by phone”:** Lookup by (instructor_id, channel, normalized_identifier). Covered by unique index.

### 5.3 Avoiding N+1 and heavy joins

- Resolve customer once per inbound message batch or per conversation; do not resolve per message in a loop without batching.
- When loading conversation list with “customer” info, either join customers once (conversation → customer) or load customer ids and batch-fetch customers. No per-row customer fetch in a loop.

---

## 6. Acceptance criteria

- **Same normalized number → same customer (per instructor):** For a given instructor and channel, two conversations with the same normalized identifier resolve to the same customer row. Test: create/link two conversations with same phone (normalized); assert one customer, two conversations linked to it.
- **Different numbers → different customers:** Two different normalized identifiers produce two customer rows (same instructor, same channel). Test: two phones; two customers.
- **Zero silent duplicates:** Inserting a second customer with same (instructor_id, channel, normalized_identifier) either fails with unique violation or is idempotent (no second row). Test: attempt duplicate; assert at most one row.
- **Instructor isolation:** Query “customers for instructor A” never returns a customer owned by instructor B. Test: create customer for A; query as B; assert not visible.
- **Normalization consistency:** Same raw input always yields same normalized_identifier. Test: normalize N times; assert N identical outputs.
- **Graceful missing customer:** If no customer can be resolved (e.g. invalid id), conversation can still exist; no exception that blocks ingestion. Test: send message with unparseable id; assert conversation created or existing one used, and no customer or “unlinked” state.

Pass: all tests above pass. Fail: any test fails or any invariant is violated.

---

## 7. Open questions

- **Table name:** Use `customers` or `customer_profiles` to align with existing docs (e.g. Customer Memory spec that may reference customer_profiles)?
- **Conversation link:** Prefer adding `customer_id` (FK) on conversations for a clear 0..1 relationship, or keep only `customer_identifier` (text) and derive customer from (instructor_id, channel, normalized(customer_identifier))?
- **Channel in mapping today:** `channel_identity_mapping` is unique on (channel, customer_identifier) without instructor_id. For CM-1, should the **new** customer table be the only place with instructor scope, and resolution logic always goes conversation → instructor_id → (instructor_id, channel, normalized_id) → customer? Or should channel_identity_mapping itself gain instructor_id and become (instructor_id, channel, customer_identifier) unique? Product/architecture decision.
- **Backfill:** Should existing conversations with `customer_identifier` set be backfilled into `customers` and optionally conversation.customer_id? Out of scope for “design only” but affects migration strategy.
- **Normalization rule in code:** Where does the normalization function live (db package vs api) and who owns the rule (e.g. “digits only”, “min 10 digits”)? Single place to avoid divergence.

---

*End of CM-1 design document. No code or migrations are included. Consistent with STEP 9 and human-in-control.*
