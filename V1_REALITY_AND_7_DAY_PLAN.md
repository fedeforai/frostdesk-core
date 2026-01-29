# FrostDesk V1 — Reality Check & 7-Day Delivery Plan

**Date:** 2026-01-27  
**Scope:** Current codebase only. No hypotheticals. No future assumptions.

---

## SECTION 1 — REALITY CHECK

**Current system as it is today.**

- **WhatsApp inbound**
  - POST `/webhook/whatsapp` exists and is the canonical path (per governance).
  - Parses Meta payload, validates text messages, normalizes to internal format.
  - Resolves conversation by channel + sender (default `instructor_id = 1`).
  - Persists via `persistInboundMessageWithInboxBridge` (writes to `inbound_messages` and `messages`).
  - Then calls `orchestrateInboundDraft` (classification + optional draft). Orchestration failure is caught; webhook still returns 200.
  - **Reality:** Inbound is live and usable **if** Meta is pointed at this URL and DB schema matches (see schema note below).

- **AI reads and classifies**
  - `classifyRelevanceAndIntent` → `classifyRelevance` (keyword/stub) + `classifyIntent` (keyword/stub).
  - Relevance: small-talk/spam/out-of-domain vs domain keywords (booking, lesson, price, etc.).
  - Intent: NEW_BOOKING, RESCHEDULE, CANCEL, INFO_REQUEST via regex patterns.
  - **Reality:** Classification is deterministic keyword/regex. No LLM. Usable for pilot.

- **AI knows when to respond vs stop**
  - `decideByConfidence` + `escalationGate` in `inbound_draft_orchestrator`: allowDraft / requireEscalation from relevance + intent confidence.
  - `buildAIDecisionSnapshot` (observability): eligibility + blockers (low_confidence, explicit_request, negative_sentiment, booking_risk, policy_block, ai_disabled) from `evaluateAIResponseEligibility` + `classifyEscalationNeed` + `isAIEnabledForConversation`.
  - **Reality:** Gating exists and is used; decision snapshot is read-only for admin. No autonomous send.

- **AI generates drafts**
  - `generateAIReply` in `packages/ai/src/ai_reply_stub.ts`: returns fixed text (IT: "Grazie per il tuo messaggio..."; EN: "Thanks for your message...").
  - No instructor data, no availability, no services, no personalization.
  - **Reality:** Drafts are usable only as placeholder; not tailored to instructor or context.

- **Human inbox and intervention**
  - Admin app: `/admin/human-inbox`, `/admin/human-inbox/[conversationId]`. Human inbox list and detail with messages, AI decision panel, AI draft panel, send box.
  - Human can: (1) send manual outbound via `ConversationSendBox` → POST `/admin/messages/outbound` (persists only; no WhatsApp delivery); (2) approve AI draft via `AIDraftPanel` → `sendAIDraftApproval(conversationId)`.
  - **Reality:** `sendAIDraftApproval` is **not defined** in `apps/admin/lib/adminApi.ts`; the Send-draft button would fail at runtime unless the function is added. Manual outbound persists to DB only; no WhatsApp delivery anywhere in the human-approval path.

- **Booking data**
  - Schema: `bookings` (id, conversation_id, instructor_id, date, time, duration, status). Admin routes: list bookings, get booking detail, override status. Lifecycle and audit exist.
  - **Reality:** Booking data exists and is readable. No AI-driven booking creation (worker is placeholder).

- **Google Calendar**
  - `packages/integrations/google_calendar_adapter.ts`: OAuth exchange, refresh token, `fetchEvents`. Used by instructor app via Supabase Edge Functions (calendar/connect, events, sync).
  - **Reality:** Calendar is “connected” in the sense that adapter exists and instructor app has calendar UI; no real-time sync in scope (explicitly out of scope in FROSTDESK_V1_SCOPE_FREEZE).

- **Instructor data**
  - `instructor_profile_repository` / `instructor_profile_service` use table `instructor_profiles` (id, full_name, base_resort, working_language, contact_email). Instructor app calls Supabase Edge Functions (e.g. instructor/profile) which call these services.
  - No `CREATE TABLE instructor_profiles` in `packages/db/migrations` or `supabase/migrations`; table must exist elsewhere or be created manually.
  - **Reality:** Code assumes `instructor_profiles` exists. AI draft does **not** use instructor data.

- **Schema note**
  - `message_repository.persistInboundMessageWithInboxBridge` inserts into `inbound_messages` **without** `message_type`. Migration `005_inbound_messages.sql` has `message_type TEXT NOT NULL`. If DB was not altered (e.g. drop column or default), inserts will fail.

---

## SECTION 2 — V1 READY vs V1 MISSING

### V1-READY (Can be used in pilot today)

- WhatsApp webhook: receive, parse, validate, persist, orchestrate (classify + optional draft).
- Conversation resolution by channel + sender; default instructor_id.
- Messages and inbound_messages persistence (subject to schema alignment).
- AI classification: relevance + intent (stub/keyword).
- AI gating: allowDraft / requireEscalation; observability snapshot (eligible + blockers).
- AI draft: stub reply stored in message_metadata; no send from orchestrator.
- Admin human inbox: list conversations, detail with messages, AI decision panel, manual outbound (DB only).
- Admin: bookings list/detail, override status, lifecycle, audit; dashboard/KPI/system health; feature flags; AI quota.
- Human app: inbox, observability, reply (API exists).
- Instructor app: profile, services, availability, meeting points, policies, calendar (Edge Functions); booking list/detail/lifecycle.
- Roles: profiles/users tables; admin_access (assertAdminAccess, assertRoleAllowed); send-ai-draft and outbound guarded.
- POST `/admin/messages/outbound`: persists outbound message (human); no WhatsApp delivery.
- POST `/admin/conversations/:id/send-ai-draft`: approves draft, persists as outbound, deletes draft; no WhatsApp delivery.

### V1-MISSING (Blocking real value)

| Item | Why it blocks value | Type | ≤7 days? |
|------|---------------------|------|----------|
| **WhatsApp outbound delivery** | Human “sends” only persist to DB. Client never sees reply. No payment value without delivery. | TECHNICAL | YES (wire existing `sendWhatsAppAck`-style call from approved send path; same env/token). |
| **`sendAIDraftApproval` in adminApi** | AIDraftPanel calls it; function is missing. Approve-draft button breaks at runtime. | TECHNICAL | YES (add one function calling POST send-ai-draft). |
| **inbound_messages.message_type** | Code inserts without message_type; migration has NOT NULL. Inserts can fail. | TECHNICAL | YES (add migration: drop column or add default). |
| **Instructor data for AI draft** | Draft is generic stub. Ski instructor gets no pricing/availability/services in reply. | PRODUCT | NO (needs prompt + data fetch + guardrails; >7 days). |
| **Single instructor_id wiring** | Webhook uses hardcoded `1`; conversations.instructor_id from Supabase migration. Clarify and document. | PRODUCT/UX | YES (doc + env or config). |
| **instructor_profiles table** | Referenced by instructor profile service; no migration in repo. Profile UI fails if table missing. | TECHNICAL | YES (add migration or run script). |

---

## SECTION 3 — DEMO NARRATIVE (REAL, NOT FAKE)

**Actors:** 1 Ski Instructor (paying user), 1 Real Client (WhatsApp), 1 Human Operator.

1. **Instructor setup**
   - Instructor logs into instructor app (Supabase Auth). Profile, services, availability, meeting points, policies are editable via Edge Functions. Calendar can be connected (OAuth + fetch events). No setup in Fastify API; all required data is “in the system” only if `instructor_profiles` (and related) tables exist and are populated.

2. **Client sends WhatsApp message**
   - Client sends a text message to the business number. Meta calls POST `/webhook/whatsapp`. API parses payload, resolves conversation (channel + sender, default instructor 1), persists to `inbound_messages` and `messages`, then runs `orchestrateInboundDraft`: relevance + intent classification, confidence/escalation gate, optional stub draft stored in `message_metadata`. No outbound send.

3. **AI reads context**
   - AI uses only message text and keyword/regex logic. It does **not** read instructor profile, services, availability, or calendar. Draft is generic (“Thanks for your message…” / “Grazie per il tuo messaggio…”).

4. **AI draft and human review**
   - Human operator opens Admin → Human Inbox, selects conversation. Detail shows messages, AI Reply Decision (eligible/blockers), and AI draft panel. To “approve” draft they click Send; that calls `sendAIDraftApproval(conversationId)` which is **currently undefined** — must be implemented to POST `/admin/conversations/:id/send-ai-draft`. That route persists the draft as an outbound message (sender_identity human) and deletes the draft. No WhatsApp delivery today.

5. **Outcome visible in dashboard**
   - Approved or manual outbound appears in conversation detail and timeline. Booking list/detail, lifecycle, and audit are visible in admin. No message is sent to the client’s WhatsApp unless outbound delivery is implemented.

**Honest manual steps:** (1) Ensure DB schema matches code (inbound_messages, messages, conversations, instructor_profiles). (2) Add `sendAIDraftApproval` in adminApi. (3) For real value, add one outbound WhatsApp send on approve/manual send (using existing Meta token and phone number id).

---

## SECTION 4 — 7-DAY DELIVERY PLAN

**Goal:** A V1 a ski instructor would pay for in pilot: WhatsApp in, AI draft, human approve, **reply actually delivered to WhatsApp**, and visibility in dashboard.

| Day | Objective | Exact tasks | Files/modules | Done when |
|-----|-----------|-------------|---------------|-----------|
| **1** | Schema and API client | (1) Migration or script: fix `inbound_messages` (drop `message_type` or add default). (2) Ensure `instructor_profiles` exists (migration or doc + script). (3) Add `sendAIDraftApproval(conversationId)` in adminApi: POST `/admin/conversations/:id/send-ai-draft` with session. | `packages/db/migrations` or supabase; `apps/admin/lib/adminApi.ts` | Webhook insert succeeds; profile fetch works; Send draft does not throw. |
| **2** | WhatsApp outbound on approve | (1) Add outbound delivery to approve path: after `sendApprovedAIDraft` (or equivalent), call WhatsApp Cloud API to send same text to conversation’s customer. (2) Resolve conversation → customer phone (channel_identity_mapping or conversations). (3) Use existing `META_WHATSAPP_TOKEN`, add/store `phone_number_id` if needed. | `packages/db/src/ai_draft_send_service.ts` or `ai_draft_send_repository.ts`; `apps/api/src/integrations/whatsapp_outbound.ts` (extend for generic send); conversation/customer lookup | Approving a draft sends the message to the client’s WhatsApp. |
| **3** | WhatsApp outbound on manual send | Wire POST `/admin/messages/outbound` to same WhatsApp send: after `persistOutboundMessage`, send body text to conversation’s customer. Reuse phone resolution and token. | `apps/api/src/routes/admin/outbound_message.ts`; shared WhatsApp send helper | Manual send from Human Inbox delivers to WhatsApp. |
| **4** | Phone resolution and idempotency | (1) Ensure every conversation has a stable customer phone for WhatsApp (from webhook “from” or channel_identity_mapping). (2) Document/ensure phone_number_id for outbound. (3) No duplicate sends on retry (idempotency key or “last outbound” check). | `packages/db` (conversation/customer identity); `webhook_whatsapp.ts` (store from); outbound helper | Every outbound has a target phone; no duplicate sends. |
| **5** | Error handling and observability | (1) If WhatsApp send fails after persist: log, return clear error to admin UI; consider “sent: false” or status. (2) No silent retries that duplicate messages. (3) Optional: store outbound external_id in messages.raw_payload for audit. | Outbound route and send-ai-draft path; message_repository | Failures visible; no silent double-send. |
| **6** | Pilot runbook and env | (1) Document env: META_WHATSAPP_TOKEN, phone_number_id, Supabase, API URL. (2) One-page runbook: receive message → see in inbox → approve or type → confirm delivery. (3) Smoke test: inbound → draft → approve → message on phone. | README or docs; .env.example | Another dev can run and verify E2E. |
| **7** | Lock and ship | (1) No new features. (2) Kill list enforced. (3) Final E2E: WhatsApp in → Human Inbox → approve draft → client gets reply; manual send → client gets reply. | — | Pilot-ready: human-approved replies reach the client. |

---

## SECTION 5 — KILL LIST (EXPLICIT)

Do **not** touch these to ship V1. If it’s not essential to “AI answering WhatsApp safely using instructor data” (with human approval and actual delivery), it’s here.

- **Legacy webhook** (`apps/api/src/routes/webhook.ts`): Do not use for WhatsApp inbound; do not add features. Canonical path is `webhook_whatsapp.ts`.
- **Autonomous AI:** No send from orchestrator; no background job that sends messages; no AI-triggered outbound without human action.
- **New channels:** No email, SMS, or other channels.
- **Schema rewrites:** No redesign of messages/conversations/bookings; only minimal fixes (e.g. message_type, instructor_profiles).
- **Worker:** No new logic in apps/worker (remains placeholder).
- **AI model changes:** No swap to LLM for classification or draft in 7 days; keep stub/keyword.
- **Instructor-specific draft:** No prompt that uses instructor data in 7 days; keep generic draft.
- **Real-time calendar sync:** No automated calendar writes or sync.
- **Payments, customer auth, multi-tenant, marketplace, mobile apps:** Out of scope.
- **Admin feature creep:** No new admin features beyond what’s needed for inbox + send + booking visibility.
- **Human app vs admin app:** Do not unify or refactor; use admin for human-approval flow.
- **A/B tests, analytics, dashboards beyond existing:** Out of scope.

---

## OUTPUT RULES (MET)

- Concise, precise, factual.
- No marketing; no future vision; no UI fantasies; no diagrams.
- Assumes technical, impatient reader.
- Goal: ship a pilot where the instructor pays because replies actually reach the client on WhatsApp.
