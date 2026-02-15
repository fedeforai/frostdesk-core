# FrostDesk AI Protocol Reference

> Canonical description of the AI operational protocol.
> Source of truth for how AI behaves in the FrostDesk platform.
>
> **Last audit:** 2026-02-15

---

## 1. Entry Points

AI is invoked from exactly two production paths and one admin path.

### 1.1 Inbound WhatsApp Orchestrator (primary)

| Field | Value |
|-------|-------|
| File | `packages/db/src/inbound_draft_orchestrator.ts` |
| Function | `orchestrateInboundDraft()` |
| Trigger | Inbound WhatsApp text message via `apps/api/src/routes/webhook_whatsapp.ts` |
| AI tasks | intent_classification, language_detection, draft_generation, summary_update |

This is the only production path that runs the full AI pipeline.

### 1.2 Legacy Webhook (out of pilot scope)

| Field | Value |
|-------|-------|
| File | `apps/api/src/routes/webhook.ts` |
| Function | Inline POST `/webhook` handler |
| Trigger | Legacy channel, whatsapp text (documented as out of pilot scope) |
| AI tasks | Draft/reply generation only |

### 1.3 Admin AI Draft (manual trigger)

| Field | Value |
|-------|-------|
| File | `apps/api/src/routes/admin/ai_draft.ts` |
| Function | GET `/admin/conversations/:conversationId/ai-draft` |
| Trigger | Admin user manually requests a draft |
| AI tasks | None (returns fixed text; no LLM call) |

---

## 2. AI Package Architecture

All AI logic lives in `packages/ai/src/`. This package has **zero** imports from `@frostdesk/db`. AI never queries the database directly; it only receives structured inputs from the orchestrator.

### Real LLM call site

There is exactly **one** real LLM call in the system:

```
packages/ai/src/openai_reply.ts → generateAIReplyOpenAI()
  model: gpt-4o-mini (hardcoded)
  provider: OpenAI
  max_tokens: 256
  temperature: 0.7
```

All other AI functions are deterministic (regex/keyword/heuristic):

| Function | File | LLM? |
|----------|------|------|
| `classifyRelevance()` | `relevanceClassifier.ts` | No (regex) |
| `classifyIntent()` | `intentClassifier.ts` | No (regex) |
| `classifyRelevanceAndIntent()` | `relevanceAndIntentClassifier.ts` | No (composes above) |
| `mapConfidenceToBand()` | `confidence_band.ts` | No (pure function) |
| `decideByConfidence()` | `confidenceDecisionEngine.ts` | No (pure function) |
| `decideBooking()` | `bookingDecision.ts` | No (pure function) |
| `escalationGate()` | `escalationGate.ts` | No (pure function) |
| `sanitizeDraftText()` | `draftQualityGuardrails.ts` | No (regex/rules) |
| `extractBookingFields()` | `packages/db/src/booking_field_extractor.ts` | No (regex) |
| Language detection | `ai_router.ts` (runLanguageDetection) | No (regex, `lang-heuristic-v1`) |

---

## 3. Task Routing & Model Selection

Central dispatch: `runAiTask()` in `packages/ai/src/ai_router.ts`.

| Task | Documented tier | Actual model | LLM? |
|------|----------------|-------------|------|
| `intent_classification` | Cheap | `stub-v1` (regex) | No |
| `language_detection` | Cheap | `lang-heuristic-v1` (regex) | No |
| `draft_generation` | Strong (gpt-4o in comments) | `gpt-4o-mini` | **Yes** |
| `summary_update` | Cheap | `gpt-4o-mini` (or stub) | **Yes** |

> **Note:** The router documents draft_generation as "STRONG (gpt-4o)" but the implementation hardcodes `gpt-4o-mini`.

---

## 4. Timeouts

| Task | Constant | Value | Mechanism |
|------|----------|-------|-----------|
| Intent classification | `AI_TIMEOUT.INTENT` | 2,500 ms | `withTimeout()` in `ai_timeout.ts` |
| Draft generation | `AI_TIMEOUT.DRAFT` | 6,000 ms | `withTimeout()` in `ai_timeout.ts` |
| Summary update | `SUMMARY_TIMEOUT_MS` | 3,000 ms | `withTimeout()` in `summary_generator.ts` |
| Language detection | — | None | Sync heuristic, no timeout needed |

`withTimeout()` races the promise against a timer. On timeout it returns `{ timedOut: true, elapsedMs }` without cancelling the underlying promise (JS limitation).

---

## 5. Decision Logic

### 5.1 Confidence Thresholds

Defined in `packages/ai/src/confidencePolicy.ts`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `RELEVANCE_MIN` | 0.70 | Minimum relevance to consider message relevant |
| `INTENT_MIN_DRAFT` | 0.75 | Minimum intent confidence to allow draft generation |
| `INTENT_MIN_NO_ESCALATION` | 0.85 | Minimum intent confidence to avoid human escalation |
| `DRAFT_MIN_CONFIDENCE` | 0.60 | Minimum intent confidence for draft eligibility (orchestrator) |

### 5.2 Confidence Bands

Defined in `packages/ai/src/confidence_band.ts`:

| Band | Score range | `bandAllowsDraft()` | `bandRequiresEscalation()` |
|------|------------|---------------------|---------------------------|
| A_CERTAIN | >= 0.92 | true | false |
| B_HIGH | >= 0.82 | true | false |
| C_MEDIUM | >= 0.68 | true | true |
| D_LOW | >= 0.50 | false | true |
| E_UNKNOWN | < 0.50 | false | true |

> **Note:** The orchestrator uses threshold-based `decideByConfidence()` + `escalationGate()`, not the band helpers. Bands are for telemetry/UI.

### 5.3 Decision Matrix (what the orchestrator actually uses)

`decideByConfidence()` in `confidenceDecisionEngine.ts`:

| Condition | Decision | Gate: allowDraft | Gate: requireEscalation |
|-----------|----------|-----------------|------------------------|
| relevance < 0.70 | IGNORE | false | false |
| relevance >= 0.70, intent < 0.75 | ESCALATE_ONLY | false | true |
| relevance >= 0.70, 0.75 <= intent < 0.85 | DRAFT_AND_ESCALATE | true | true |
| relevance >= 0.70, intent >= 0.85 | DRAFT_ONLY | true | false |

### 5.4 Draft Eligibility (all must be true)

```
gate.allowDraft === true
  AND intent IN ('NEW_BOOKING', 'RESCHEDULE', 'INFO_REQUEST')  // OPERATIVE_INTENTS
  AND intentConfidence >= 0.6                                    // DRAFT_MIN_CONFIDENCE
```

### 5.5 Skip Reasons

When a draft is not generated, one of these reasons is recorded:

| Skip reason | Meaning |
|-------------|---------|
| `gate_denied` | Gate policy says no draft (IGNORE or ESCALATE_ONLY) |
| `intent_non_operative` | Intent not in OPERATIVE_INTENTS |
| `confidence_low` | Intent confidence < DRAFT_MIN_CONFIDENCE (0.6) |
| `draft_timeout` | Draft generation timed out (6s) |
| `quality_blocked` | `sanitizeDraftText()` blocked the draft |
| `error` | Exception during draft generation |

---

## 6. Context Injection

### What the LLM receives for draft generation

| Context | Source | In LLM prompt? | Read-only? | Fail-open? |
|---------|--------|----------------|-----------|------------|
| Message text | Webhook payload | Yes (user message) | Yes | N/A |
| AI summary | `getConversationSummary()` | Yes (in `customerContext`) | Yes | Yes |
| Customer context | `getLastCompletedBookingContext()` → `buildCustomerContextPrompt()` | Yes (in `customerContext`) | Yes | Yes |
| Detected language | `runAiTask({ task: 'language_detection' })` | Yes (system prompt instruction) | Yes | Yes |
| Recent messages | `getRecentMessagesForSummary()` | **No** (summary prompt only) | Yes | Yes |
| Instructor metadata | `getConversationInstructorId()` | **No** (telemetry only) | Yes | Yes |

### Architectural constraint

> **AI never queries DB directly.** `packages/ai` has zero imports from `@frostdesk/db` or `sql`. The orchestrator (in `packages/db`) fetches all context and passes structured arguments to `runAiTask()`.

---

## 7. Guardrails

### 7.1 Auto-booking prevention

- Orchestrator can only write to `ai_booking_drafts` (status=`pending_review`).
- Never calls `createBooking()` or any booking mutation function.
- Confirming an AI booking draft only updates draft status; does not create a real booking.

### 7.2 Booking state mutation

- `transitionBookingState()` is only called from instructor/admin API routes.
- Orchestrator has no import of `booking_repository` or `booking_state_machine`.
- All booking mutations require JWT + ownership verification.

### 7.3 Auto-sending replies

- Orchestrator never calls any outbound send function.
- Code comment: "No autonomous outbound send".
- Instructor reply requires JWT + profile + ownership.
- Admin send-draft requires `requireAdminUser` + `assertRoleAllowed(['system_admin', 'human_approver'])`.
- "Use draft" only marks draft as used; does NOT send to WhatsApp.

### 7.4 Prompt-level guardrails

- `openai_reply.ts`: "Do not make up availability or prices."
- `customer_context_prompt.ts`: "Do not auto-create bookings. Suggest clarifications if any detail is missing."

### 7.5 Draft quality guardrails

`sanitizeDraftText()` in `draftQualityGuardrails.ts` blocks drafts containing:

| Rule | Severity | What it catches |
|------|----------|----------------|
| NO_COMMITMENT | Blocking | Confirmation, availability, price, booking language |
| NO_ASSUMPTIONS_DATE | Blocking | Specific dates |
| NO_ASSUMPTIONS_TIME | Blocking | Specific times |
| NO_ASSUMPTIONS_PRICE | Blocking | Specific prices |
| TONE_CHECK | Blocking | Assertive tone instead of conditional/suggestive |

Returns `safeDraftText: null` when any blocking violation is found. **This is fail-closed by design** — bad drafts are never persisted.

---

## 8. Logging vs Audit

| Layer | Destination | Data | Purpose |
|-------|------------|------|---------|
| Technical logging | stdout/stderr (JSON) | request, ai_span, errors | Technical observability |
| AI usage telemetry | `ai_usage_events` table | task, model, tokens, cost, latency, timeout, error | Cost telemetry |
| AI classification | `ai_snapshots` table | message, relevance, intent, confidence, model | Business audit |
| Conversation summary | `conversations.ai_summary` | Rolling summary text, version | Context persistence |
| Booking state audit | `booking_audit` table | booking, previous/new state, actor | Business audit (no AI writes) |
| General audit | `audit_log` table | actor, action, entity, payload | Business/operational audit |

### Audit events written by AI pipeline

- `inbound_message_received`
- `ai_classification` (with decision: ignore/escalate)
- `ai_draft_generated`
- `ai_draft_skipped` (with skip reason)
- `ai_draft_timeout`
- `ai_booking_draft_created`
- `conversation_ai_summary_updated`

---

## 9. Failure Matrix

| Task | Timeout | On timeout | On error | Fallback | Fail-open? |
|------|---------|-----------|----------|----------|------------|
| Intent classification | 2.5s | Fallback snapshot (confidence=0, escalate) | Router returns error result → confidence 0 → escalate | Escalate, no draft | **Yes** |
| Language detection | None | N/A (sync heuristic) | Catch → keep original hint | Keep hint | **Yes** |
| Draft generation | 6s | Audit `ai_draft_timeout`, no draft | Stub fallback or no draft | No draft persisted | **Yes** |
| Summary update | 3s | Return null, keep existing | Return null, keep existing | Keep existing summary | **Yes** |
| Booking extraction | N/A | N/A (deterministic) | N/A | `complete: false` → generic draft | **Yes** |
| Draft guardrails | N/A | N/A (pure function) | N/A | Block bad draft | **Fail-closed** (by design) |

**Invariants:**
- Inbox never blocks on AI failure
- Booking never mutates on AI failure
- All AI errors are fail-open (except draft quality which is intentionally fail-closed)

---

## 10. End-to-End Protocol

When a WhatsApp message arrives:

1. **Webhook receives** the message, validates, normalizes phone to E.164.
2. **Conversation resolved** — find or create by channel + sender.
3. **Customer upserted** and linked (best-effort).
4. **Message persisted** to `inbound_messages` and `messages` **before any AI runs** (idempotent on `external_message_id`).
5. **Audit event** `inbound_message_received` written (best-effort).
6. **Orchestration begins** — `orchestrateInboundDraft()` in try/catch. If it throws, webhook still returns `200`.
7. **Idempotency check** — if `ai_snapshot` exists for this message_id, return existing result.
8. **Classification** — `runAiTask({ task: 'intent_classification' })` with 2.5s timeout. Regex/keyword classifiers. On timeout: fallback snapshot (confidence=0).
9. **Booking decision** — `decideBooking()`: relevance < 0.70 → **ignore**; intent < 0.75 → **escalate**; otherwise → **ai_reply**.
10. **For ignore/escalate**: snapshot inserted, audit written, return. No draft.
11. **For ai_reply**: confidence policy → escalation gate → snapshot persisted.
12. **Draft eligibility** — `gate.allowDraft && operativeIntent && confidence >= 0.6`.
13. **Language detection** (heuristic), **customer context** (last booking), **summary** (update if policy triggers, via gpt-4o-mini with 3s timeout).
14. **Structured booking draft** (if NEW_BOOKING/RESCHEDULE and extraction complete) → `ai_booking_drafts`.
15. **Generic text draft** (otherwise) → `runAiTask({ task: 'draft_generation' })` via gpt-4o-mini with 6s timeout.
16. **Quality guardrails** — `sanitizeDraftText()`. Blocked → draft not persisted.
17. **Draft persisted** if safe. Audit event written.
18. **Return** to webhook. Webhook returns `200`.

---

## 11. What Cannot Happen By Design

1. **AI cannot send a message to the customer** — orchestrator has no outbound send call.
2. **AI cannot create a confirmed booking** — only writes to `ai_booking_drafts` (pending_review).
3. **AI cannot mutate booking state** — no import of `booking_repository` or `booking_state_machine`.
4. **AI cannot trigger payment or cancellation** — no access to payment or cancel functions.
5. **AI cannot bypass draft quality guardrails** — `sanitizeDraftText()` is fail-closed.
6. **AI failure cannot block the inbox** — message persisted before AI; orchestrator in try/catch.
7. **AI failure cannot lose the inbound message** — persisted before AI runs.
8. **AI cannot query the database directly** — `packages/ai` has zero DB imports.
