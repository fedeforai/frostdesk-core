# FrostDesk AI Protocol — Quick Reference Map

> One-page lookup for the AI operational protocol.

---

## Task → Model → Timeout → Fallback

| Task | Model / Tier | Timeout | On Timeout / Error | Fail mode |
|------|-------------|---------|-------------------|-----------|
| Intent classification | `stub-v1` (regex) | 2,500 ms | confidence=0, escalate | Fail-open |
| Language detection | `lang-heuristic-v1` (regex) | None (sync) | Keep original hint | Fail-open |
| Draft generation | `gpt-4o-mini` | 6,000 ms | No draft; audit `ai_draft_timeout` | Fail-open |
| Summary update | `gpt-4o-mini` | 3,000 ms | Keep existing summary | Fail-open |
| Booking field extraction | deterministic (regex) | None | `complete: false` → generic draft | Fail-open |
| Draft quality guardrails | deterministic (rules) | None | Block bad draft | **Fail-closed** |

---

## Decision Outcomes

| Outcome | Condition | What happens |
|---------|-----------|-------------|
| **Ignore** | relevance < 0.70 | Snapshot persisted, no draft, no escalation |
| **Escalate** | relevance >= 0.70, intent < 0.75 | Snapshot persisted, no draft, marked for human review |
| **Suggest draft** | relevance >= 0.70, intent >= 0.75, operative intent, confidence >= 0.60 | Draft generated and quality-checked |

---

## Decision Thresholds

| Constant | Value | Source file |
|----------|-------|-------------|
| `RELEVANCE_MIN` | 0.70 | `packages/ai/src/confidencePolicy.ts` |
| `INTENT_MIN_DRAFT` | 0.75 | `packages/ai/src/confidencePolicy.ts` |
| `INTENT_MIN_NO_ESCALATION` | 0.85 | `packages/ai/src/confidencePolicy.ts` |
| `DRAFT_MIN_CONFIDENCE` | 0.60 | `packages/db/src/inbound_draft_orchestrator.ts` |

---

## Operative Intents (draft-eligible)

Only these intents can trigger draft generation:

```
NEW_BOOKING | RESCHEDULE | INFO_REQUEST
```

All other intents (e.g., CANCEL, GENERIC, UNKNOWN) → no draft.

---

## Skip Reasons

When a draft is **not** generated, one of these is recorded:

| Reason | Meaning |
|--------|---------|
| `gate_denied` | Confidence policy blocked (ignore or escalate-only) |
| `intent_non_operative` | Intent not in NEW_BOOKING / RESCHEDULE / INFO_REQUEST |
| `confidence_low` | intentConfidence < 0.60 |
| `draft_timeout` | LLM did not respond within 6s |
| `quality_blocked` | `sanitizeDraftText()` blocked the draft |
| `error` | Exception during draft generation |

---

## Confidence Bands (telemetry)

| Band | Score range |
|------|-----------|
| A_CERTAIN | >= 0.92 |
| B_HIGH | >= 0.82 |
| C_MEDIUM | >= 0.68 |
| D_LOW | >= 0.50 |
| E_UNKNOWN | < 0.50 |

---

## Draft Quality Blocking Rules

| Rule | Catches |
|------|---------|
| NO_COMMITMENT | Confirmation, availability, price, booking language |
| NO_ASSUMPTIONS_DATE | Specific dates |
| NO_ASSUMPTIONS_TIME | Specific times |
| NO_ASSUMPTIONS_PRICE | Specific prices |
| TONE_CHECK | Assertive tone |

Any blocking violation → `safeDraftText: null` → draft **not persisted**.

---

## Summary Policy Triggers (OR logic)

| Trigger | Threshold | Source |
|---------|-----------|--------|
| Message count | >= 10 | `MESSAGE_THRESHOLD` in `summary_policy.ts` |
| Intent changed | boolean | e.g. info → booking |
| Booking state changed | boolean | e.g. draft → pending |
| Token budget exceeded | > 2,000 | `TOKEN_BUDGET_SOFT_LIMIT` in `summary_policy.ts` |

---

## Audit Events Written by AI Pipeline

```
inbound_message_received
ai_classification
ai_draft_generated
ai_draft_skipped
ai_draft_timeout
ai_booking_draft_created
conversation_ai_summary_updated
```
