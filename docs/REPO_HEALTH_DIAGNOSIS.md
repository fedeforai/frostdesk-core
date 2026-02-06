# Repo Health Diagnosis (Phase B/C) — frostdesk-core

Deterministic diagnosis + minimal fixes applied so that **pnpm -w run build**, **pnpm -w dev**, and **pnpm verify:pnpm** are green. No refactors, no endpoint behavior changes.

---

## Phase 1 — Workspace packages, build scripts, formats

| Package | Build script | Module format | DTS |
|---------|--------------|---------------|-----|
| frostdesk-core (root) | `pnpm --filter '@frostdesk/db' --filter '@frostdesk/api' -r run build` | — | — |
| @frostdesk/db | `tsup src/index.ts --format esm,cjs --dts` | ESM + CJS | yes |
| @frostdesk/api | `tsc` | ESM (tsc emit) | yes |
| @frostdesk/ai | `npm exec tsup` (tsup.config: format esm) | ESM | yes |
| @frostdesk/admin | `next build` | — | — |
| @frostdesk/instructor | `next build` | — | — |
| @frostdesk/human | `next build` | — | — |
| @frostdesk/web | `tsc && vite build` | — | — |
| @frostdesk/worker | `tsc` | — | — |
| @frostdesk/integrations | `tsc` | — | — |

Root **build** only runs **db** and **api**. Root **dev** runs **db** and **api** in parallel (`-r --parallel run dev`).

---

## Phase 1 — Diagnosis table (before fixes)

| Command | Status | Root cause | Files involved | Fix strategy |
|---------|--------|------------|----------------|---------------|
| `pnpm -w run build` | FAIL | 1) db DTS fails: index.ts re-exports from instructor_profile_repository symbols that do not exist. 2) api tsc fails: missing module `@supabase/supabase-js` (db.ts), missing module `./instructor/profile.js`. | packages/db/src/index.ts, packages/db/src/instructor_profile_repository.ts; packages/db/src/inbound_draft_orchestrator.ts (intent type); apps/api/src/db.ts, apps/api/src/routes/instructor.ts, apps/api/src/routes/instructor/profile.ts (missing) | Align db exports with repository (add missing fns + types); narrow intent type in orchestrator; remove Supabase type dependency in api (use ReturnType); add missing instructor profile route. |
| `pnpm --filter @frostdesk/db run build` | FAIL | DTS step fails: same instructor_profile_repository export mismatch; then inbound_draft_orchestrator intent type not assignable to 'booking' \| 'info'. | As above | Same as above (db + orchestrator only). |
| `pnpm -w dev` | — | Depends on build; db dev must output dist/index.js (ESM). Script already has `--format esm,cjs`. | packages/db/package.json | Already correct; no change. |
| `pnpm verify:pnpm` | PASS | Only runs pnpm -r list and optional curl to API. | scripts/verify_repo.sh | None. |

---

## Phase 2 — Minimal fix plan (commit sequence)

| # | Commit title | Files | Change summary | Verify |
|---|--------------|-------|-----------------|--------|
| 1 | db: align instructor_profile exports and DTS | packages/db/src/instructor_profile_repository.ts | Add InstructorProfile.onboarding_completed_at; add getInstructorProfileByUserId, createInstructorProfile, updateInstructorProfileByUserId, completeInstructorOnboarding; add CreateInstructorProfileParams, UpdateInstructorProfileByUserIdParams; extend getInstructorProfile SELECT with onboarding_completed_at. | pnpm --filter @frostdesk/db run build |
| 2 | db: fix decideBooking intent type in orchestrator | packages/db/src/inbound_draft_orchestrator.ts | Narrow intentForBooking to type 'booking' \| 'info' and use 'info' for non-booking intents (no CANCEL/INFO_REQUEST passed to decideBooking). | pnpm --filter @frostdesk/db run build |
| 3 | api: remove @supabase/supabase-js type dependency in db.ts | apps/api/src/db.ts | Use ReturnType<typeof createDbClient> instead of SupabaseClient from @supabase/supabase-js so tsc does not require that module. | pnpm --filter @frostdesk/api run build (after db build) |
| 4 | api: add missing instructor profile route | apps/api/src/routes/instructor/profile.ts | Add instructorProfileRoutes: GET /instructor/profile, PATCH /instructor/profile using getInstructorProfileByUserId and updateInstructorProfileByUserId. | pnpm -w run build |

---

## Phase 3 — Applied fixes (summary)

- **packages/db/src/instructor_profile_repository.ts**  
  - Extended InstructorProfile with onboarding_completed_at; added CreateInstructorProfileParams, UpdateInstructorProfileByUserIdParams.  
  - getInstructorProfile: SELECT includes onboarding_completed_at.  
  - Added getInstructorProfileByUserId(userId), createInstructorProfile(params), updateInstructorProfileByUserId(params), completeInstructorOnboarding(instructorId).

- **packages/db/src/inbound_draft_orchestrator.ts**  
  - intentForBooking explicitly typed as 'booking' \| 'info', non-booking intents mapped to 'info'.

- **apps/api/src/db.ts**  
  - Replaced SupabaseClient from @supabase/supabase-js with DbClient = ReturnType<typeof createDbClient>.

- **apps/api/src/routes/instructor/profile.ts** (new)  
  - GET /instructor/profile and PATCH /instructor/profile using @frostdesk/db profile APIs; same error/response shape as other instructor routes.

No PII or audit changes in this pass. Audit payloads (no phone_number, no free-text reason in admin override) were already fixed in a previous review.

---

## Verification checklist (after fixes)

| # | Command | Expected |
|---|---------|----------|
| 1 | `pnpm --filter @frostdesk/db run build` | Exit 0; dist/index.js, dist/index.cjs, dist/index.d.ts present. |
| 2 | `pnpm -w run build` | Exit 0; db and api build success. |
| 3 | `pnpm -w dev` | db and api start; no build/runtime errors from db or api. |
| 4 | `pnpm verify:pnpm` | Exit 0; PASS. |
| 5 | (with API running) `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health` | 200. |
| 6 | (with API running) `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/admin/audit` | 401 (no auth). |
| 7 | `ls packages/db/dist` | index.js, index.cjs (and .d.ts) listed. |
| 8 | No new refactors, no route renames, no response/status changes for existing endpoints. | Manual check. |

---

## Constraints respected

- No refactors; no renaming of routes; no change to response bodies or status codes of existing endpoints.
- Only minimal patches for build/runtime correctness and exports alignment.
- Audit: append-only; no PII (phone_number, free-text reason) in payloads (already enforced earlier).
- One logical theme per commit (db exports, db type fix, api type fix, api missing route).
