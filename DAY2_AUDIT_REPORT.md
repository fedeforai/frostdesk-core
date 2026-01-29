# DAY 2 — Technical Audit Report

**FrostDesk v1 · Pilot Mode**

---

## 1. Message Ingestion & Persistence

**Audit paths:** `apps/api/src/routes/webhook_whatsapp.ts`, `packages/db/src/message_repository.ts`, `packages/db/src/inbound_messages_repository.ts`

**Note:** Spec referenced `apps/api/src/routes/webhooks/meta_whatsapp.ts`; actual file is `webhook_whatsapp.ts`. Primary pilot path is POST `/webhook/whatsapp`.

**Idempotency:** Enforced. `persistInboundMessageWithInboxBridge` (message_repository.ts) calls `findInboundMessageByExternalId(params.channel, params.externalMessageId)` before any insert; if existing, returns existing id and performs no insert (lines 149–158). Inserts use transaction; single logical write per external message.

**Single write per external message:** Yes. Idempotency key is (channel, external_message_id). Second delivery of same external_id results in no new rows.

**Side effects beyond persistence:** The webhook handler does more than persistence: after `persistInboundMessageWithInboxBridge` it calls `orchestrateInboundDraft` (webhook_whatsapp.ts lines 206–219). Orchestration writes to ai_snapshots and optionally to draft storage (message_metadata). No outbound send in this path. Draft orchestration failure is caught and does not affect HTTP response (200 still returned).

**Legacy path:** POST `/webhook` in `apps/api/src/routes/webhook.ts` also parses Meta WhatsApp payloads, uses `findInboundMessageByExternalId` / `insertInboundMessage` (inbound_messages_repository), and has autonomous behavior: `sendAIReply` (ai_reply_service) and `sendWhatsAppAck` + `createMessage` for outbound (webhook.ts lines 213–258). That path violates v1 scope (autonomous AI / outbound send). Governance states WhatsApp inbound MUST go only through webhook_whatsapp.ts.

**Verdict:** Known Risk  
**Evidence:** message_repository.ts `persistInboundMessageWithInboxBridge` (idempotency at 149–158, transaction at 165–224). webhook_whatsapp.ts: persist then orchestrateInboundDraft; no send. webhook.ts: autonomous send path present; if Meta is pointed at POST /webhook, scope is violated.

---

## 2. Conversation Timeline Integrity

**Conversation creation:** `resolveConversationByChannel` (conversation_repository.ts) finds or creates conversation via channel_identity_mapping; creates conversation with createConversation when no mapping exists (lines 155–178). No duplicate conversation for same (channel, customer_identifier) due to unique constraint.

**Message ordering:** Messages for a conversation are read via `getMessagesByConversation` (message_repository.ts) with `ORDER BY created_at ASC` (line 49). Inbound insert uses `receivedAt` for created_at (message_repository.ts line 219); ordering is by insert time.

**Direction integrity:** Inbound path sets direction `'inbound'` in persistInboundMessageWithInboxBridge (message_repository.ts line 214). Outbound path sets `'outbound'` in persistOutboundMessage (line 281). No code path observed that flips direction for the same logical message.

**Schema note:** 001_init.sql defines messages with (conversation_id, role, content, created_at). message_repository and ai_reply_service insert (conversation_id, channel, direction, message_text, sender_identity, external_message_id, raw_payload, created_at). No migration in audited set adds these columns; possible schema drift or migration outside audited set.

**Verdict:** Pass  
**Evidence:** conversation_repository.ts resolveConversationByChannel, createConversation; message_repository.ts getMessagesByConversation ORDER BY created_at ASC; direction set at insert only.

---

## 3. Intent Classification (Read-only AI)

**Audit:** `packages/db/src/inbound_draft_orchestrator.ts` — classification and snapshot only; no conversation or message state mutation beyond snapshot.

**Intent classification:** `classifyRelevanceAndIntent` (from @frostdesk/ai) is called with messageText, channel, language (lines 106–110). Return value used only for snapshot and draft eligibility.

**Snapshot writes:** `insertAISnapshot` (ai_snapshot_repository.ts) is called with classification and decision fields (inbound_draft_orchestrator.ts lines 125–139). Snapshot table is append-only audit data.

**State mutation:** No updates to conversations or messages for intent. No booking or payment writes. Only inserts: ai_snapshots and, when allowed, draft row in message_metadata (insertDraftOnce).

**Verdict:** Pass  
**Evidence:** inbound_draft_orchestrator.ts steps 3–6: classifyRelevanceAndIntent → decideByConfidence → escalationGate → insertAISnapshot. No conversation/message UPDATE or business state change.

---

## 4. AI Decision & Eligibility (Deterministic)

**Audit:** Same orchestrator; decision and eligibility are deterministic gates, no side effects beyond snapshot and optional draft.

**Decision engine:** `decideByConfidence` (@frostdesk/ai) takes relevanceConfidence and intentConfidence; returns decision and reason (inbound_draft_orchestrator.ts lines 114–116).

**Blockers / eligibility:** `escalationGate` returns allowDraft and requireEscalation from decision/reason (lines 119–123). These are stored on snapshot and control only whether a draft is generated (step 7).

**Side effects:** Decision and gate do not mutate conversation, message, or booking state. They only feed snapshot and the boolean that gates insertDraftOnce.

**Verdict:** Pass  
**Evidence:** inbound_draft_orchestrator.ts: decideByConfidence, escalationGate, then insertAISnapshot; draft only if gate.allowDraft. No other branches that write business state.

---

## 5. AI Draft Generation (Draft-only)

**Draft creation:** In orchestrator, when gate.allowDraft is true, `generateAIReply` is called then `sanitizeDraftText` (draftQualityGuardrails); if safe, `insertDraftOnce` is called (inbound_draft_orchestrator.ts lines 144–178).

**Storage:** `insertDraftOnce` (ai_draft_repository.ts) writes to message_metadata with key `'ai_draft'` scoped by message_id (lines 100–117). Idempotent: findDraftByMessageId first; if exists, return existing (no overwrite). Draft is linked to snapshot_id.

**Sending boundaries:** No call to sendWhatsApp*, persistOutboundMessage, or any outbound delivery from inbound_draft_orchestrator or ai_draft_repository. Draft is stored only; send path is separate (admin outbound_message route).

**Verdict:** Pass  
**Evidence:** inbound_draft_orchestrator.ts 144–178: generateAIReply → sanitizeDraftText → insertDraftOnce. ai_draft_repository insertDraftOnce has no send. Outbound send only in apps/api/src/routes/admin/outbound_message.ts (human path).

---

## 6. Human Approval Boundary

**UI:** Admin app calls `sendOutboundMessage` (adminApi.ts) which POSTs to `/admin/messages/outbound` with session user id (adminApi.ts 1333–1365). No other UI-triggered send path found for customer-facing messages.

**API:** POST `/admin/messages/outbound` (apps/api/src/routes/admin/outbound_message.ts) requires body conversation_id and text. `assertAdminAccess(userId)` is called before any persist (line 84). Then `persistOutboundMessage` only (lines 87–91). No WhatsApp API call in this file; comment states "No WhatsApp delivery".

**Enforcement of human-only sending:** Only outbound path that persists messages for human-initiated send is this admin route. AI path (orchestrator) does not call persistOutboundMessage or send. Legacy webhook.ts send path is autonomous (AI/ACK) and violates scope if used; it is not the human-approval path.

**Verdict:** Pass  
**Evidence:** outbound_message.ts: assertAdminAccess then persistOutboundMessage({ senderIdentity: 'human', ... }). No integration call to Meta. adminApi sendOutboundMessage targets this endpoint only.

---

## 7. AI Snapshot Observability (F2.5.7)

**Snapshot repository:** `listAISnapshotsByConversationId` (ai_snapshot_repository.ts lines 194–221) SELECTs from ai_snapshots by conversation_id, ORDER BY created_at ASC. Read-only.

**Admin API:** GET `/admin/human-inbox/:conversationId` (apps/api/src/routes/admin/human_inbox_detail.ts) calls getHumanInboxDetailReadModel, buildAIDecisionSnapshot, and listAISnapshotsByConversationId; builds ai_snapshots_by_message_id map and returns it in response when non-empty (lines 69–79).

**UI debug panel:** AIDebugPanel (apps/admin/components/admin/AIDebugPanel.tsx) receives snapshot-derived props (relevant, intent, confidence, decision, reason, allow_draft, require_escalation, draft outcome, violations) and displays them read-only. HumanInboxDetailView builds snapshot props for the active message and renders AIDebugPanel when snapshot data is available.

**Verdict:** Pass  
**Evidence:** ai_snapshot_repository.ts listAISnapshotsByConversationId; human_inbox_detail.ts lines 69–79; AIDebugPanel.tsx presentational only; HumanInboxDetailView wires detail + ai_snapshots_by_message_id into panel.

---

## 8. Booking Read-only Integrity

**Booking repositories:** Admin booking access is via admin_booking_service and admin_booking_detail_service (routes in admin.ts). GET `/admin/bookings` and GET `/admin/bookings/:id` are read-only. POST `/admin/bookings/:id/override-status` is the only observed booking state change and is an explicit admin action.

**Admin endpoints:** Booking list and detail are GET. Override-status is POST; guarded by admin (admin.ts 173–211). No booking create/update/cancel triggered from AI or webhook paths in audited code.

**AI access boundaries:** inbound_draft_orchestrator and classifyRelevanceAndIntent do not import or call booking repositories. No booking writes from AI classification or draft flow.

**Verdict:** Pass  
**Evidence:** admin.ts booking routes use admin booking services; override-status is single mutation endpoint. No booking repository usage in inbound_draft_orchestrator, ai_snapshot_repository, or webhook_whatsapp.

---

## 9. Feature Flags, Quotas, Kill Switch

**Feature flags:** getFeatureFlag / isFeatureEnabled (feature_flag_repository.ts) and feature_flag_service exist. POST `/inbound` (inbound.ts) checks getFeatureFlag('whatsapp_inbound_enabled', env) before processing. POST `/webhook/whatsapp` does not check any feature flag before persist or orchestrate.

**Quota:** ai_quota_gate, ai_quota_repository, and admin route GET `/admin/ai-quota` exist. ai_global_gate uses isAIQuotaAvailable. webhook_whatsapp and inbound_draft_orchestrator do not call ai_global_gate, ai_quota_gate, or quota checks before running orchestration.

**Kill switch:** isAIEnvDisabled() (ai_env_kill_switch.ts) reads process.env.AI_EMERGENCY_DISABLE === 'true'. ai_global_gate uses it. That gate is not invoked in webhook_whatsapp or inbound_draft_orchestrator. So the main WhatsApp ingest + draft path runs regardless of AI_EMERGENCY_DISABLE and feature flags.

**Verdict:** Known Risk  
**Evidence:** webhook_whatsapp.ts has no call to isFeatureEnabled, isAIEnvDisabled, or isAIQuotaAvailable. inbound.ts lines 13–22 check whatsapp_inbound_enabled. ai_global_gate.ts and ai_env_kill_switch.ts exist but are not on the primary webhook/orchestrator path.

---

## 10. Negative Capability Audit

**Cron jobs with writes:** No cron, node-schedule, or similar found. Grep for cron/schedule/setInterval/background/worker found only false positives (e.g. "reschedule", "schedule" in intent keywords).

**Background automation:** No background workers or job queues observed in api or db packages for message/booking writes.

**Autonomous AI actions:** Primary path (webhook_whatsapp → persistInboundMessageWithInboxBridge → orchestrateInboundDraft) does not send messages; it only persists and writes snapshot/draft. Legacy path (webhook.ts POST /webhook) contains autonomous AI: sendAIReply and sendWhatsAppAck + createMessage (webhook.ts 213–258). If that route is registered and Meta points to POST /webhook, autonomous actions exist.

**Event-driven side effects:** Orchestration is synchronous from webhook request. No observed event bus or async handlers that perform writes after response.

**Verdict:** Known Risk (legacy route); Pass (no cron/background)  
**Evidence:** No cron/setInterval in codebase. webhook.ts 213–258: sendAIReply and sendWhatsAppAck + createMessage. server.ts registers both webhookRoutes and webhookWhatsAppRoutes; both POST endpoints exist.

---

## Final Summary

| Area                 | Status    | Notes |
|----------------------|-----------|--------|
| Message ingestion    | Known Risk | Idempotent single write in pilot path; legacy POST /webhook has autonomous send. |
| AI decision          | Pass      | Deterministic; snapshot + draft only; no state mutation. |
| Drafting             | Pass      | Draft-only storage; no send from orchestrator. |
| Human approval       | Pass      | Admin outbound route only; assertAdminAccess; persist only, no WhatsApp delivery. |
| Observability        | Pass      | Snapshots listed by conversation; admin API and AIDebugPanel expose read-only. |
| Booking integrity    | Pass      | Admin read + override-status only; AI path does not touch booking. |

---

## Blockers (max 5)

1. **Legacy POST /webhook contains autonomous AI send** — apps/api/src/routes/webhook.ts lines 213–258 call sendAIReply and sendWhatsAppAck + createMessage. This violates v1 scope (no autonomous AI actions). If Meta is configured to use POST /webhook, the system can send without human approval. Mitigation: ensure Meta uses only POST /webhook/whatsapp and/or remove or disable the autonomous block in webhook.ts.

---

## Known Risks

1. **Kill switch and feature flags not on main WhatsApp path** — AI_EMERGENCY_DISABLE and feature flags (e.g. ai_enabled, ai_whatsapp_enabled) are not checked in webhook_whatsapp.ts or inbound_draft_orchestrator. Disabling AI via env or DB does not stop draft orchestration on POST /webhook/whatsapp. File references: webhook_whatsapp.ts, inbound_draft_orchestrator.ts, ai_global_gate.ts, ai_env_kill_switch.ts.

2. **Dual webhook routes** — Both POST /webhook and POST /webhook/whatsapp are registered (server.ts). Governance says WhatsApp inbound only through webhook_whatsapp. Misconfiguration (Meta pointing to /webhook) would use the legacy path with autonomous send. File reference: apps/api/src/server.ts, webhook.ts, webhook_whatsapp.ts.

3. **messages table schema vs code** — 001_init.sql defines messages with (role, content). message_repository and ai_reply_service insert (channel, direction, message_text, sender_identity, external_message_id, raw_payload). No migration in audited set adds these columns. Either schema was extended elsewhere or code expects a different DB state. File references: packages/db/migrations/001_init.sql, packages/db/src/message_repository.ts, packages/db/src/ai_reply_service.ts.

4. **Webhook handler side effects beyond persistence** — The audit asked for “no side effects beyond persistence” for ingestion. The pilot webhook intentionally runs orchestrateInboundDraft after persist (snapshot + optional draft). So “ingestion” in the narrow sense (persist only) is clean; the same request also triggers AI draft flow. Documented as design; risk is that kill switch does not gate this orchestration (see risk 1).
