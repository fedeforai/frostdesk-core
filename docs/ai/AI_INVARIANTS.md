# FrostDesk AI Invariants

> Non-negotiable rules that must hold at all times.
> Breaking any invariant in this document is a **PR blocker**.

---

## Non-Negotiable Invariants

### INV-1: AI package isolation

`packages/ai` has **zero** runtime dependencies on `@frostdesk/db`.
AI code never imports SQL clients, repositories, or database types.

**Why:** AI is a pure function layer. It receives structured inputs and returns structured outputs. Database access is the orchestrator's responsibility.

### INV-2: Orchestrator cannot mutate bookings

`packages/db/src/inbound_draft_orchestrator.ts` does **not** import:
- `booking_repository` (no create/update/delete bookings)
- `booking_state_machine` (no state transitions)
- Any outbound message send function

**Allowed read-only imports:** `reschedule_context_repository` (SELECT-only booking lookup) and `availability_validation` (read-only conflict check) are permitted because they never mutate data.

**Why:** AI cannot create, confirm, cancel, or modify bookings. It can only suggest drafts for human review.

### INV-3: AI timeout constants are stable

| Constant | Expected value |
|----------|---------------|
| `AI_TIMEOUT.INTENT` | 2,500 ms |
| `AI_TIMEOUT.DRAFT` | 6,000 ms |

Changing these without updating downstream monitoring and SLO thresholds is unsafe.

### INV-4: Summary policy has a message-count threshold

`shouldUpdateSummary()` must include a condition `messageCountSinceLast >= MESSAGE_THRESHOLD` where `MESSAGE_THRESHOLD >= 1`.

**Why:** Without this, summaries would update on every message, causing unnecessary LLM calls and cost.

### INV-5: Draft quality guardrails block commitment language

`sanitizeDraftText()` must block drafts containing commitment patterns (confirmation, availability, price, booking completion). This is the **only fail-closed** component in the AI pipeline.

**Exception — Reschedule-verified bypass:** When `rescheduleVerified=true`, commitment/date/time/tone rules are bypassed because the data was verified by the orchestrator via `validateAvailability()` (real data, not LLM-generated). Price rules are **never** bypassed. The flag is set exclusively by the orchestrator — the LLM cannot influence it.

**Why:** Preventing the AI from making promises to customers is a business-critical safety requirement. The reschedule-verified bypass is safe because the claims are backed by system-verified data, not LLM hallucination.

### INV-6: Message persisted before AI runs

Inbound messages are written to the database **before** `orchestrateInboundDraft()` is called. AI failure cannot lose messages.

### INV-7: Webhook always returns 200

The WhatsApp webhook wraps orchestration in try/catch. AI failure does not cause webhook failure. WhatsApp does not retry successfully received messages.

### INV-8: Idempotency on ai_snapshot

If an `ai_snapshot` already exists for a `message_id`, the orchestrator returns the cached result without re-running AI.

### INV-9: Draft generation is fail-open

If draft generation times out or errors, no draft is persisted. The system continues without a draft. The inbox is never blocked.

### INV-10: Draft guardrails are fail-closed

If `sanitizeDraftText()` detects a blocking violation, `safeDraftText` is `null` and the draft is **not persisted**. Bad drafts never reach the UI.

---

## PR Blockers

If a pull request violates any of the following, it **must be blocked** until resolved:

| # | Check | How to verify |
|---|-------|--------------|
| PB-1 | `packages/ai` imports `@frostdesk/db` | Scan `packages/ai/src/**/*.ts` for `@frostdesk/db` imports |
| PB-2 | Orchestrator imports booking_repository (mutation) or outbound send | Scan import statements in `inbound_draft_orchestrator.ts`. Read-only imports (`reschedule_context_repository`, `availability_validation`) are allowed. |
| PB-3 | `AI_TIMEOUT.INTENT` != 2500 or `AI_TIMEOUT.DRAFT` != 6000 | Read `packages/ai/src/ai_timeout.ts` |
| PB-4 | `shouldUpdateSummary` lost message-count threshold | Read `packages/db/src/summary_policy.ts` |
| PB-5 | `sanitizeDraftText` no longer blocks commitment language | Run invariant tests against `draftQualityGuardrails.ts` |
| PB-6 | AI pipeline calls any booking mutation function | Scan orchestrator imports |
| PB-7 | AI pipeline calls any outbound send function | Scan orchestrator imports |
| PB-8 | Message persistence moved after AI invocation | Review `webhook_whatsapp.ts` call order |

---

## Allowed Evolutions

The following changes are **safe** and do not violate any invariant:

| Change | Safe? | Notes |
|--------|-------|-------|
| Add new intent types | Yes | As long as OPERATIVE_INTENTS is updated explicitly |
| Adjust confidence thresholds | Yes | Monitor decision distribution after change |
| Switch draft model (e.g. gpt-4o-mini → gpt-4o) | Yes | Update timeout if latency profile changes |
| Add new guardrail rules to `sanitizeDraftText()` | Yes | Only adds safety, never removes it |
| Add new audit events | Yes | Additive, no invariant violated |
| Add new context to draft prompt | Yes | As long as context is read-only and fetched by orchestrator |
| Add verified-bypass to guardrails | Yes | Only for system-verified data (e.g. `rescheduleVerified`). Price rules must never be bypassed. Flag must be set by orchestrator only. |
| Remove a guardrail rule from `sanitizeDraftText()` | **Caution** | Must not remove commitment-language blocking (INV-5) |
| Change timeout values | **Caution** | Must update monitoring/alerting thresholds (INV-3) |
| Move AI to call DB directly | **Blocked** | Violates INV-1 |
| Let orchestrator create bookings | **Blocked** | Violates INV-2 |
| Let AI send outbound messages | **Blocked** | Violates INV-2 |
| Persist message after AI runs | **Blocked** | Violates INV-6 |
