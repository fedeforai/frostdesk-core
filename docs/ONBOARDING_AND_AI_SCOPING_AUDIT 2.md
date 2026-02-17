# Onboarding and AI Scoping Audit

Audit-first investigation: multi-step onboarding draft persistence, strict AI scoping per instructor_id + conversation_id, and stability of gate/approval/complete flows.

---

## 1) Audit Findings

### 1.1 Current Onboarding Flow (end-to-end)

- **Entrypoints (instructor app)**
  - `apps/instructor/app/page.tsx`: root redirects to `/instructor/gate`.
  - `apps/instructor/app/login/page.tsx`: `DEFAULT_AFTER_LOGIN = '/instructor/gate'` (line 8).
  - `apps/instructor/app/auth/callback/page.tsx`: `DEFAULT_NEXT = '/instructor/gate'` (line 7).
  - `apps/instructor/app/instructor/(pre)/gate/page.tsx`: single gate. Session → ensure `instructors` row (insert if missing) → ensure `instructor_profiles` row (insert if missing) → redirect by state: not approved → `/instructor/approval-pending`; onboarding not completed → `/instructor/onboarding`; else `/instructor/dashboard` (or `next` param).
  - `apps/instructor/app/instructor/(pre)/onboarding/page.tsx`: reads `instructors` (id, onboarding_status, approval_status); redirects to gate if no row, approval-pending if not approved, dashboard if onboarding completed; otherwise shows link to form.
  - `apps/instructor/app/instructor/(pre)/onboarding/form/page.tsx`: gate check (session, instructors row, approved, onboarding not completed), then renders `<InstructorOnboardingForm userEmail={...} />`.
  - `apps/instructor/app/instructor/(app)/layout.tsx`: guard for all (app) routes: session → instructor row → approved → onboarding completed; else redirect to gate or onboarding.
  - `apps/instructor/app/instructor/(app)/profile/page.tsx`: on profile load can `router.replace('/instructor/gate')` (line 25).

- **API endpoints**
  - `apps/api/src/routes/instructor/onboarding.ts`:
    - `POST /instructor/onboarding/draft`: auth JWT, merge body into existing profile via `getInstructorProfileForDraft` + `upsertInstructorOnboardingDraft`, then `setInstructorOnboardingStatusInProgress`; returns `{ ok: true }`.
    - `POST /instructor/onboarding/complete`: auth JWT, validate required fields, `upsertInstructorOnboardingComplete`, `setInstructorOnboardingStatusCompleted`; returns `{ ok: true }`.

- **DB functions (packages/db)**
  - `getInstructorProfileForDraft(userId)`: `instructor_profile_repository.ts` (lines 227–250); SELECT from `instructor_profiles` including `onboarding_payload`, `whatsapp_phone`.
  - `upsertInstructorOnboardingDraft(params)`: same file (lines 266–305); INSERT/ON CONFLICT on `instructor_profiles` (no `onboarding_completed_at`).
  - `upsertInstructorOnboardingComplete(params)`: same file (lines 165–212); INSERT/ON CONFLICT on `instructor_profiles` with `onboarding_completed_at = NOW()`.
  - `setInstructorOnboardingStatusInProgress(instructorId)`: `instructor_approval_repository.ts` (lines 67–75); UPDATE `instructors` SET `onboarding_status = 'in_progress'` WHERE id and status not already `'completed'`.
  - `setInstructorOnboardingStatusCompleted(instructorId)`: same file (lines 55–61); UPDATE `instructors` SET `onboarding_status = 'completed'`.

- **Flow diagram (bullets)**
  1. User hits `/instructor/gate` (or root/login/callback).
  2. Gate page: session → ensure `instructors` row (insert if missing) → ensure `instructor_profiles` row (insert if missing).
  3. If not approved → `/instructor/approval-pending`.
  4. If onboarding_status !== 'completed' → `/instructor/onboarding`.
  5. Onboarding page: link to `/instructor/onboarding/form`.
  6. Form: Step 1 Next → `saveOnboardingDraft` (API draft) → `setStep(2)`; Step 2 Next → `saveOnboardingDraft` → `setStep(3)`; Step 3 Complete → `submitOnboardingComplete` (API complete) → redirect `/instructor/dashboard`.
  7. (app) layout: all app routes require session + instructor row + approved + onboarding completed.

---

### 1.2 Where Onboarding Data Is Stored

- **Tables**
  - **public.instructors**: id (uuid), email, created_at, updated_at, onboarding_status, whatsapp_connected, approval_status. Used for gate, layout, onboarding page (read); status updates from API (draft → in_progress, complete → completed).
  - **public.instructor_profiles**: id (uuid, = auth user id), full_name, base_resort, working_language, contact_email, onboarding_payload (jsonb), onboarding_completed_at, onboarding_status (optional per migration), approval_status (optional), whatsapp_phone, updated_at. Used by API onboarding routes and by gate (insert-only when missing).

- **Column → used by → file references**

| Column | Used by | File references |
|--------|---------|-----------------|
| instructor_profiles.id | API (userId), gate insert | onboarding.ts (userId), gate/page.tsx (eq id) |
| full_name | API draft/complete, form | instructor_profile_repository.ts, InstructorOnboardingForm.tsx |
| base_resort | API draft/complete, form | same |
| working_language | API draft/complete, form | same |
| contact_email | API (from token or existing), gate insert | onboarding.ts, gate/page.tsx |
| onboarding_payload | API merge draft, complete | instructor_profile_repository.ts, onboarding.ts |
| onboarding_completed_at | API complete, layout/inbox/reply gates | upsertInstructorOnboardingComplete, getInstructorProfile, instructor routes |
| onboarding_status | Gate insert (instructor_profiles), optional column | gate/page.tsx (line 95), migrations |
| approval_status | Gate, layout, onboarding pages | gate, layout, approval-pending |
| whatsapp_phone | API draft/complete, form | instructor_profile_repository.ts, InstructorOnboardingForm.tsx |
| instructors.onboarding_status | Gate, (app) layout, API | gate/page.tsx, layout.tsx, setInstructorOnboardingStatus* |

- **Competing/canonical**
  - **instructors**: canonical for “instructor account”; onboarding_status and approval_status drive redirects.
  - **instructor_profiles**: canonical for profile data (name, resort, language, contact, whatsapp_phone, onboarding_payload); id = auth user id; onboarding_completed_at used for feature gating in API.
  - **profiles**: exists in schema (list_tables); not used by onboarding.
  - **admin_users**: separate; admin access only.

---

### 1.3 AI Artifacts and Cross-Instructor Scoping

- **Tables and repositories**

| Table / store | Repository / usage | Filters by instructor_id? |
|---------------|--------------------|----------------------------|
| ai_snapshots | ai_snapshot_repository.ts: insertAISnapshot, findAISnapshotByMessageId, listAISnapshotsByConversation, listAISnapshotsByConversationId | No. Keyed by message_id or conversation_id only. |
| message_metadata (key 'ai_draft') | ai_draft_repository.ts: saveAIDraft, getAIDraftMetadata, findDraftByMessageId, insertDraftOnce | No. By conversation_id or message_id. |
| message_metadata (key 'intent_classification') | human_inbox_detail_repository.ts, conversation_timeline_repository.ts | No. By conversation_id. |
| ai_drafts | instructor_draft_repository.ts: getActiveDraftForConversation, getDraftById, markDraftUsed, markDraftIgnored | Yes. Queries use `conversation_id AND instructor_id` (e.g. lines 51, 99). |
| instructor_draft_events | instructor_draft_events_repository.ts: insertInstructorDraftEvent | Yes. Inserts instructor_id. |
| conversations.ai_state (conversation_ai_state) | conversation_ai_state_repository.ts: getConversationAiState, setConversationAiState | No. By conversation_id only. |
| conversations (table) | conversation_repository.ts: getConversationById, getOpenConversationByCustomer | getConversationById: no instructor filter (caller must check). getOpenConversationByCustomer: no instructor filter (finds by customer_identifier only). |

- **Call sites that must enforce ownership**
  - Instructor draft: `apps/api/src/routes/instructor/drafts.ts` (lines 66–76): gets conversation by id, then checks `conv.instructor_id === profile.id` before returning draft. Correct.
  - Instructor timeline: `apps/api/src/routes/instructor/conversation_timeline.ts` (lines 38–54): getConversationById then `ownerId !== instructorId` → 403. Correct.
  - Instructor reply: `apps/api/src/routes/instructor/reply.ts`: uses getInstructorInbox(profile.id) and checks conversation in list; no getConversationById. Correct.
  - Admin human inbox detail: `apps/api/src/routes/admin/human_inbox_detail.ts`: requireAdminUser; then listAISnapshotsByConversationId(conversationId). Admin-only; no instructor scoping required for admin.

- **Summary**
  - **ai_snapshots**: no instructor_id column; access by conversation_id only; cross-instructor leakage only if a caller gets conversation_id without verifying ownership. Instructor routes that take conversation_id do verify via getConversationById + instructor_id check.
  - **message_metadata (ai_draft)**: no instructor_id; scoped by conversation_id/message_id. Same as above: safe if callers always verify conversation ownership first.
  - **ai_drafts**: has instructor_id; repository already scopes by (conversation_id, instructor_id). Safe.
  - **conversation_ai_state**: by conversation_id only; safe when used only after ownership check.

---

### 1.4 Conversation Ownership Truth

- **Schema**
  - **conversations** (used in conversation_repository.ts): has `id`, `instructor_id` (numeric in TypeScript interface; DB may be uuid per createConversation), `customer_identifier`, `channel`, `status`, `created_at`, `updated_at`. Uniqueness: primary key on `id` only (no composite (id, instructor_id) unique).
  - **conversation_threads** (used in admin_conversation_repository): has `instructor_id` (uuid); separate from `conversations` in code paths audited.

- **Ownership**
  - Ownership of a conversation is defined by `conversations.instructor_id`. There is no composite unique on (id, instructor_id); any code that receives a conversation_id can call getConversationById(conversationId) and then enforce `conv.instructor_id === currentInstructorId`.

- **FK and AI tables**
  - ai_snapshots: has conversation_id; no FK to instructors; no instructor_id column.
  - message_metadata: references message_id and/or conversation_id; no instructor_id.
  - ai_drafts: has conversation_id and instructor_id; suitable for composite scope.
  - Instructor-facing API routes that accept conversation_id use getConversationById then compare instructor_id to the authenticated instructor.

---

### 1.5 Risk Hotspots (prioritized)

| Risk | File | Query / behavior | Impact |
|------|------|-------------------|--------|
| getOpenConversationByCustomer(customerIdentifier) has no instructor filter | packages/db/src/conversation_repository.ts (lines 124–136) | SELECT by customer_identifier only; returns single conversation. | If multiple instructors share same customer_identifier (e.g. phone), wrong conversation could be returned. |
| listAISnapshotsByConversationId(conversationId) has no instructor_id | packages/db/src/ai_snapshot_repository.ts (lines 174–194) | SELECT by conversation_id only. | Caller must ensure conversation ownership; instructor routes that use it (e.g. via getConversationById first) are safe. Admin uses it for any conversation (intended). |
| getConversationById(conversationId) returns conversation without requiring instructor | packages/db/src/conversation_repository.ts (102–117) | SELECT by id only. | By design: ownership enforced at API layer. All instructor routes checked enforce conv.instructor_id === profile.id. |
| Human inbox detail / buildAIDecisionSnapshot / listAISnapshotsByConversationId called with conversationId from URL | apps/api/src/routes/admin/human_inbox_detail.ts | Admin-only; conversationId from params. | Low: admin can see any conversation; no instructor isolation required. |
| Gate inserts into instructor_profiles with server Supabase client | apps/instructor/app/instructor/(pre)/gate/page.tsx (88–97) | Insert id, contact_email, working_language, onboarding_status, approval_status, onboarding_payload. | Depends on RLS: if RLS allows insert by auth.uid() = id, safe. If service role, safe. No direct client-side write from browser. |
| Onboarding form does not rehydrate from DB on load | InstructorOnboardingForm.tsx | Form state is client-only until draft/complete API called. | Refreshing page loses in-progress form data unless we add load-from-profile on mount. |

---

## 2) Options (no implementation)

### A) Onboarding draft persistence

**Constraints:** Keep `/instructor/onboarding/complete` as-is; draft must allow partial updates and be safe under retries; no security weakening.

**Option A1 – Current design (draft API + in_progress)**  
- **What changes:** None beyond what exists: POST `/instructor/onboarding/draft` with merge semantics, `setInstructorOnboardingStatusInProgress`, form calls saveOnboardingDraft on Step 1/2 Next.  
- **DB:** Already in place: instructor_profiles (with onboarding_payload, whatsapp_phone), instructors.onboarding_status.  
- **Pros:** Minimal; already implemented; retry-safe (merge payload, upsert).  
- **Cons:** Form does not rehydrate from DB on page load (refresh loses step state).  
- **Failure modes:** API or DB down: user sees error banner, stays on step; can retry.

**Option A2 – Draft API + rehydration**  
- **What changes:** Instructor app: on onboarding form page load, fetch profile (e.g. from API or server-side) and prefill form state and step from onboarding_payload / onboarding_status.  
- **Files:** New or existing API GET for “my profile” (or use existing profile endpoint), apps/instructor (form page or form component) to load and set initial state.  
- **DB:** No change.  
- **Pros:** Refresh and return-to-form preserve data; better UX.  
- **Cons:** Slightly more code; need to derive “current step” from payload or status.  
- **Failure modes:** Load fails: show form empty or with error; user can re-enter.

**Option A3 – Draft API + idempotent step field**  
- **What changes:** Persist “last completed step” in onboarding_payload (e.g. `step: 1 | 2`) on each draft save; form rehydrates and sets step from payload.  
- **Files:** Same as A2, plus form sends step in payload and server merges it.  
- **DB:** No schema change; only payload shape.  
- **Pros:** Explicit step in DB; rehydration is deterministic.  
- **Cons:** Payload shape change; same failure modes as A2 for load.

---

### B) AI scoping hardening

**Constraints:** Prevent cross-instructor data access by construction; prefer DB-level constraints/indexes; minimal idempotent migrations; no break to existing data.

**Option B1 – Application-only checks (current pattern)**  
- **What changes:** None. Keep enforcing ownership in every instructor route that takes conversation_id: getConversationById(conversationId) then require conv.instructor_id === profile.id.  
- **Schema:** None.  
- **Pros:** No migration; already in place for audited routes.  
- **Cons:** New routes might forget the check; no DB-level guarantee.

**Option B2 – Add instructor_id to ai_snapshots and enforce in queries**  
- **Schema:** Add column `instructor_id uuid REFERENCES instructors(id)` (or instructor_profiles) to ai_snapshots; backfill from conversations.instructor_id WHERE conversation_id = ai_snapshots.conversation_id; then add NOT NULL and index (conversation_id, instructor_id).  
- **Query updates:** insertAISnapshot: set instructor_id from conversation lookup; listAISnapshotsByConversationId: add AND instructor_id = $instructorId (and require caller to pass instructorId).  
- **Backfill:** One-time UPDATE ai_snapshots SET instructor_id = (SELECT instructor_id FROM conversations c WHERE c.id = ai_snapshots.conversation_id).  
- **Pros:** DB enforces scope if all reads filter by instructor_id; reduces risk of future bugs.  
- **Cons:** Migration and backfill; all call sites of listAISnapshotsByConversationId must pass instructor_id (admin can pass a “no filter” or use a different function).

**Option B3 – Composite unique / RLS on AI tables**  
- **Schema:** Add instructor_id to ai_snapshots (as in B2). Optionally add CHECK or unique (conversation_id, message_id) where applicable. For instructor-scoped reads, use RLS policies on ai_snapshots so that SELECT is allowed only where instructor_id = auth.uid() (if using Supabase auth and instructor_id = auth users id).  
- **Pros:** RLS can enforce access at DB layer.  
- **Cons:** Larger change; API uses direct SQL (packages/db) not necessarily Supabase client with RLS; would need to align auth.uid() with instructor_id (instructors.id is auth user id). So RLS may be viable but requires careful alignment.

---

## 3) Recommended Minimal Plan

- **Onboarding (draft persistence)**  
  **Recommendation: A2 (Draft API + rehydration).**  
  - Keep current draft/complete API and flow (A1). Add a single, minimal rehydration path: when the onboarding form page loads, fetch the current instructor profile (from existing or new read-only API) and, if onboarding_status is not completed, prefill form fields and set the current step from onboarding_payload (e.g. step 1 if no step2, else 2, else 3). No change to /instructor/onboarding/complete; no new dependencies; safe under retries.

- **AI scoping**  
  **Recommendation: B1 + lightweight B2 (add instructor_id to ai_snapshots, backfill, use in new/updated reads).**  
  - Keep application-level ownership checks in all instructor routes (B1). Add instructor_id to ai_snapshots for future-proofing and to allow DB-level scoping: migration (idempotent) add column, backfill from conversations, then add NOT NULL and index; update insertAISnapshot to set instructor_id from conversation; add a new function listAISnapshotsByConversationIdForInstructor(conversationId, instructorId) used by instructor-facing code, and keep listAISnapshotsByConversationId for admin-only use. This minimizes risk of cross-instructor leakage without a full RLS rollout (B3).

---

## 4) Implementation Checklist (file-by-file, no code)

**Onboarding rehydration (A2)**  
1. **API:** Ensure there is a GET endpoint for the current instructor’s profile (or onboarding draft) that returns instructor_profiles row (including onboarding_payload, onboarding_status from instructors if needed). If missing, add e.g. GET /instructor/onboarding/profile or extend existing profile route.  
2. **apps/instructor:** On the onboarding form page (server or client): call that API (or fetch profile server-side with existing Supabase/server session), and pass to InstructorOnboardingForm: initialFullName, initialBaseResort, initialWorkingLanguage, initialWhatsappPhone, initialPayload, initialStep (derived from payload or status).  
3. **InstructorOnboardingForm.tsx:** Accept optional initial* props; on mount, if provided, set state (full_name, base_resort, working_language, whatsapp_phone, etc.) and step; otherwise keep current default state.  
4. **Optional:** When saving draft, include in onboarding_payload a field like `lastStep: 1 | 2` so rehydration can set step deterministically (A3 light).

**AI scoping (B2 light)**  
5. **Migration (idempotent):** Add instructor_id to ai_snapshots (nullable first), backfill from conversations, then ALTER to NOT NULL if desired, add index (conversation_id, instructor_id).  
6. **packages/db ai_snapshot_repository.ts:** insertAISnapshot: resolve instructor_id from conversation_id (getConversationById or single SELECT) and insert it; listAISnapshotsByConversationId: keep as-is for admin; add listAISnapshotsByConversationIdForInstructor(conversationId, instructorId) that filters by both.  
7. **API instructor routes:** Any instructor route that currently uses listAISnapshotsByConversationId (if any) switch to listAISnapshotsByConversationIdForInstructor(conversationId, profile.id). (Audit showed admin uses listAISnapshotsByConversationId; instructor routes use getConversationById + ownership check and may not read snapshots directly; confirm and update if needed.)  
8. **No change** to getOpenConversationByCustomer in this minimal plan; document as known risk (single conversation per customer) and consider a follow-up to scope by instructor when multiple instructors can have same customer.

---

## 5) Test Checklist

**Local**  
- Onboarding: (1) Complete flow Step 1 → Step 2 → Step 3 → Complete; (2) Step 1 Next, refresh page, confirm form and step rehydrated; (3) Step 2 Next, refresh, rehydrated; (4) Draft API returns 400 when no existing profile and missing required step-1 fields; (5) Complete API returns 400 when required fields missing; (6) Gate still redirects to approval-pending when not approved, to onboarding when not completed, to dashboard when completed.  
- AI scoping: (7) Instructor A cannot access instructor B’s conversation by ID (403); (8) Instructor A can access own conversation timeline/draft; (9) After migration, insertAISnapshot writes instructor_id; (10) listAISnapshotsByConversationIdForInstructor returns only rows for that instructor.

**Prod-mode**  
- (11) Run migrations idempotently (apply twice, no errors); (12) Backfill ai_snapshots.instructor_id completes and no NULLs if NOT NULL added; (13) Existing instructor inbox and reply flows unchanged; (14) Admin human inbox detail still returns snapshots for any conversation.

---

## 6) Write surface and RLS

### Routes that perform DB writes (route -> repository function -> tables)

| Route | Repository function(s) | Tables touched |
|-------|------------------------|----------------|
| POST /instructor/onboarding/draft | getInstructorProfileForDraft, upsertInstructorOnboardingDraft, setInstructorOnboardingStatusInProgress | instructor_profiles, instructors |
| POST /instructor/onboarding/complete | upsertInstructorOnboardingComplete, setInstructorOnboardingStatusCompleted | instructor_profiles, instructors |
| POST /instructor/inbox/:conversation_id/reply | insertInstructorReply, markConversationHumanHandled | messages, conversation state |
| GET /instructor/conversations/:id/draft | getConversationById, getActiveDraftForConversation (read) | (read-only) |
| POST /instructor/drafts/:draftId/use, :draftId/ignore | markDraftUsed, markDraftIgnored | ai_drafts |
| Instructor booking routes | booking repository (create/update) | bookings |
| Webhook / orchestrator | insertAISnapshot, insertDraftOnce | ai_snapshots, message_metadata |
| Admin routes | various (approval, outbound, etc.) | instructors, messages, etc. |
| Gate (Next server) | Supabase client insert | instructors, instructor_profiles |

### Credentials

- **API (Node):** All DB writes from the API go through `packages/db` using `packages/db/src/client.ts`: `postgres(databaseUrl)` (postgres.js). DATABASE_URL is a direct Postgres connection (service/backend role). API writes do not use the Supabase anon key; RLS is not applied to this connection unless the role is non-superuser and RLS is enabled for the role.
- **Instructor app (Next):** Gate and form pages use `apps/instructor/lib/supabaseServer.ts` getSupabaseServer() with NEXT_PUBLIC_SUPABASE_ANON_KEY and cookies (createServerClient). Supabase anon key plus RLS applies for reads/writes from the Next server (e.g. gate insert into instructors and instructor_profiles). Form draft/complete submission goes to the API with Bearer JWT; the actual draft/complete writes are performed by the API (postgres connection), not by the Supabase client.

### RLS

No RLS policies are defined in the repo for instructor_profiles, instructors, ai_snapshots, message_metadata, or conversations. Only `packages/db/migrations/015_add_admin_users_table.sql` contains ENABLE ROW LEVEL SECURITY and a POLICY on admin_users. API access is via direct Postgres connection (DATABASE_URL). Gate writes from the Next server use the Supabase anon client; RLS may apply there if configured in the Supabase dashboard but is not defined in the repo.

---

## 7) EXPLAIN (runnable SQL snippets)

Run in psql with bound values substituted for $1, $2. Use EXPLAIN (ANALYZE) only when safe (e.g. read-only or on a copy of data).

**1. getInstructorProfileForDraft**

```sql
EXPLAIN (FORMAT TEXT)
  SELECT id, full_name, base_resort, working_language, contact_email, whatsapp_phone,
         COALESCE(onboarding_payload, '{}'::jsonb) AS onboarding_payload
  FROM instructor_profiles
  WHERE id = $1::uuid
  LIMIT 1;
```

**2. upsertInstructorOnboardingDraft**

```sql
EXPLAIN (FORMAT TEXT)
  INSERT INTO instructor_profiles (id, full_name, base_resort, working_language, contact_email, whatsapp_phone, onboarding_payload, updated_at)
  VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    base_resort = EXCLUDED.base_resort,
    working_language = EXCLUDED.working_language,
    contact_email = EXCLUDED.contact_email,
    whatsapp_phone = COALESCE(EXCLUDED.whatsapp_phone, instructor_profiles.whatsapp_phone),
    onboarding_payload = EXCLUDED.onboarding_payload,
    updated_at = NOW();
```

**3. setInstructorOnboardingStatusInProgress**

```sql
EXPLAIN (FORMAT TEXT)
  UPDATE public.instructors
  SET onboarding_status = 'in_progress'
  WHERE id = $1::uuid
    AND (onboarding_status IS NULL OR onboarding_status != 'completed');
```

**4. insertAISnapshot (idempotency check + instructor lookup + insert)**

```sql
EXPLAIN (FORMAT TEXT) SELECT id FROM ai_snapshots WHERE message_id = $1::uuid LIMIT 1;
EXPLAIN (FORMAT TEXT) SELECT instructor_id FROM conversations WHERE id = $2::uuid LIMIT 1;
EXPLAIN (FORMAT TEXT)
  INSERT INTO ai_snapshots (message_id, conversation_id, instructor_id, channel, relevant, relevance_confidence, relevance_reason, intent, intent_confidence, model, created_at)
  VALUES ($1::uuid, $2::uuid, $3::uuid, 'whatsapp', true, 0, NULL, NULL, NULL, '', NOW());
```

**5. listAISnapshotsByConversationIdForInstructor**

```sql
EXPLAIN (FORMAT TEXT)
  SELECT id, message_id, conversation_id, channel, relevant, relevance_confidence, relevance_reason, intent, intent_confidence, model, created_at
  FROM ai_snapshots
  WHERE conversation_id = $1::uuid
    AND (instructor_id IS NULL OR instructor_id = $2::uuid)
  ORDER BY created_at ASC;
```

**6. getConversationById**

```sql
EXPLAIN (FORMAT TEXT)
  SELECT id, instructor_id, customer_identifier, created_at, updated_at
  FROM conversations
  WHERE id = $1;
```

**Index recommendations:** instructor_profiles(id) is PK. instructors(id) is PK. ai_snapshots(conversation_id, instructor_id) index added in migration 20260215120000. conversations(id) is PK; conversations_id_instructor_id_uq unique index added for composite FK. Use EXPLAIN to confirm index usage; add indexes if plans show sequential scans on hot paths.

---

## 8) Security invariants

| Invariant | Enforced where | Proof sketch |
|-----------|----------------|--------------|
| No cross-instructor read of conversations via instructor API | Each instructor route that takes conversation_id calls getConversationById then checks conv.instructor_id === profile.id | apps/api/src/routes/instructor/drafts.ts 66-76; conversation_timeline.ts 38-54; reply.ts uses getInstructorInbox and owned list |
| No cross-instructor read of ai_snapshots via instructor API | Instructor routes do not call listAISnapshotsByConversationId; admin only. New instructor-scoped reads use listAISnapshotsByConversationIdForInstructor after ownership check | listAISnapshotsByConversationId only used in apps/api/src/routes/admin/human_inbox_detail.ts |
| Draft access requires conversation ownership | GET /instructor/conversations/:id/draft and use/ignore draft routes use getConversationById then instructor_id check | apps/api/src/routes/instructor/drafts.ts: getConversationById(conversationId), then ownerId !== instructorId -> 403 |
| Onboarding complete requires required fields | POST /instructor/onboarding/complete validates full_name, base_resort, working_language, whatsapp_phone non-empty; returns 400 otherwise | apps/api/src/routes/instructor/onboarding.ts 104-119: if (!full_name \|\| !base_resort \|\| !working_language \|\| !whatsapp_phone) return 400 |
| Draft and complete never write contact_email from body | contact_email taken from getAuthUserFromJwt(request).email in API; client does not send contact_email | apps/instructor/lib/instructorApi.ts saveOnboardingDraft and submitOnboardingComplete do not include contact_email in body; onboarding.ts draft uses email ?? existing, complete uses email ?? '' |
| ai_snapshots rows cannot have mismatched (conversation_id, instructor_id) after migration | Composite FK ai_snapshots(conversation_id, instructor_id) REFERENCES conversations(id, instructor_id); insertAISnapshot resolves instructor_id from conversations | supabase/migrations/20260215120000_ai_snapshots_instructor_scoping.sql; packages/db/src/ai_snapshot_repository.ts insertAISnapshot selects instructor_id from conversations then inserts |

---

*End of audit and minimal plan.*
