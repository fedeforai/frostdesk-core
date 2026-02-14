# Instructor Profile Flow – Audit & Fix

## 1) Repo audit (evidence-based)

### A) UI – Profile editor

| Item | Location | Evidence |
|------|----------|----------|
| ProfileForm | `apps/instructor/components/ProfileForm.tsx` | Default export, props `profile`, `onSaved?` |
| Page that loads profile | `apps/instructor/app/instructor/(app)/profile/page.tsx` | `fetchInstructorProfile()` in `loadProfile()`, `ProfileForm profile={profile}` |
| State refresh after save | Same page | **Gap:** `onSaved` is not passed; after save, page state is not updated from response |

### B) Client API

| Item | Location | Evidence |
|------|----------|----------|
| fetchInstructorProfile | `apps/instructor/lib/instructorApi.ts` L64–79 | GET `/api/instructor/profile`, credentials include, returns `data.profile` or null |
| updateInstructorProfile | `apps/instructor/lib/instructorApi.ts` L88–106 | PATCH `/api/instructor/profile`, body `JSON.stringify(params)`, returns `data.profile` |
| Types | Same file L35–57 | `InstructorProfile` (id, full_name, base_resort, working_language, contact_email, languages?, timezone?, display_name?, slug?, marketing_fields?, operational_fields?); `UpdateInstructorProfileParams` has no `display_name`/`slug` |

### C) Next proxy

| Item | Location | Evidence |
|------|----------|----------|
| Route | `apps/instructor/app/api/instructor/[...path]/route.ts` | GET/POST/PATCH/PUT/DELETE → `proxy()` |
| Upstream path | L66 | `backendPath = '/instructor/${pathSegments.join('/')}'` → `/instructor/profile` |
| Auth | L43–44, L70–73 | `getServerSession()`, `Authorization: Bearer ${session.access_token}`; 401 if no session |

### D) Fastify profile routes

| Item | Location | Evidence |
|------|----------|----------|
| GET /instructor/profile | `apps/api/src/routes/instructor/profile.ts` L132–192 | `resolveProfile(userId)` → definitive or legacy; definitive response includes profile_status, timezone, display_name, slug, marketing_fields (definitive camelCase/nested), operational_fields (definitive nested) |
| Legacy GET response | L168–183 | id, full_name, base_resort, working_language, contact_email, languages, onboarding_completed_at, marketing_fields, operational_fields |
| PATCH | L197–284 | `patchProfileBodySchema.safeParse(body)` → definitive path; else `validateLegacyPatch` + `updateInstructorProfileByUserIdExtended` |
| Legacy PATCH | validateLegacyPatch L31–106 | Validates and returns full_name, base_resort, working_language, contact_email, languages?, marketing_fields?, operational_fields?; **same_day_booking_allowed** is validated (L81–84) |

### E) DB alignment

| Item | Location | Evidence |
|------|----------|----------|
| patchProfileBodySchema | `packages/db/src/instructor_profile_definitive_domain.ts` L226–239 | full_name, display_name, slug, timezone, marketing_fields (camelCase: shortBio, etc.), operational_fields (nested: constraints.sameDayAllowed, location.travelBufferMin) |
| Definitive types | Same file L9–48 | MarketingFields: shortBio, extendedBio, teachingPhilosophy, targetAudiences, uspTags; OperationalFields: constraints.*, location.* |
| Legacy repo | `packages/db/src/instructor_profile_repository.ts` | getInstructorProfileByUserId selects languages, marketing_fields, operational_fields (L126–135); updateInstructorProfileByUserIdExtended shallow-merges JSONB, no display_name/slug in params |
| Legacy table | Migrations | instructor_profiles: user_id, display_name, timezone, languages text[], marketing_fields jsonb, operational_fields jsonb, slug, etc. |

---

## 2) Mismatches (findings table)

| Layer | Sends/accepts/returns | Problems |
|-------|------------------------|----------|
| **UI** | Identity: full_name, base_resort, working_language, languages, timezone, contact_email. Marketing: short_bio, extended_bio, teaching_philosophy, target_audience, usp_tags. Operations: max_students_*, min_booking_duration_minutes, same_day_booking_allowed, advance_booking_hours, travel_buffer_minutes. No display_name/slug in form. | No refresh after save (onSaved not passed). No display_name/slug fields. |
| **Client API** | InstructorProfile has display_name?, slug?. UpdateInstructorProfileParams has no display_name/slug. Uses snake_case and flat shapes. | Params incomplete for identity. |
| **Proxy** | Forwards to `/instructor/profile`, Bearer from session. | None. |
| **Fastify GET** | Definitive: returns marketing_fields/operational_fields as stored (camelCase/nested). Legacy: returns flat snake_case. | Definitive response shape not consumable by UI (different keys/structure). |
| **Fastify PATCH** | Definitive path only if body matches patchProfileBodySchema (camelCase/nested). UI sends snake_case → always legacy path. | Definitive rows get updated via legacy path; JSONB ends up snake_case; timezone/display_name/slug not updated from UI. |
| **DB** | Legacy extended update does not set display_name, slug. | Can’t persist display_name/slug from legacy path. |

---

## 3) Definitive fix plan

1. **GET normalization (Fastify)**  
   When returning a definitive profile, map `marketing_fields` and `operational_fields` to the **unified** shape (snake_case, flat) the UI expects. Support both camelCase and snake_case in DB for backward compatibility.

2. **PATCH unified→definitive (Fastify)**  
   When `patchProfileBodySchema.safeParse(body)` fails, if the user has a definitive profile, map the request body (unified/snake_case) to `PatchProfileBody` and call `patchInstructorProfileByUserId`. Otherwise keep legacy path.

3. **Legacy path (DB + Fastify)**  
   Add optional `display_name` and `slug` to `UpdateInstructorProfileByUserIdExtendedParams` and to the legacy UPDATE; in `validateLegacyPatch` accept and pass optional `display_name`, `slug`.

4. **Profile page**  
   Pass `onSaved={(p) => setProfile(p)}` so state refreshes after save.

5. **ProfileForm**  
   Add optional display_name and slug to Identity tab; include in identity save; do not send empty strings (use undefined/null).

6. **Client API**  
   Add `display_name` and `slug` to `UpdateInstructorProfileParams`.

7. **No silent overwrites**  
   ProfileForm already uses `undefined` for optional marketing/operations; identity should send `display_name`/`slug` only when set (undefined or null, not `''`).

---

## 4) Manual test plan

1. Load profile page while logged in → GET populates all fields (identity, marketing, operations).
2. Update Identity only → PATCH only identity keys; refresh → identity persisted; marketing/operations unchanged.
3. Update Marketing only → only marketing_fields updated and merged; refresh → marketing persisted.
4. Update Operations only → only operational_fields updated and merged; refresh → operations persisted; same_day_booking_allowed works.
5. Test with a user that has a **definitive** profile row (profile_status, timezone, etc.) → GET returns unified shape; form populated; save updates DB (definitive or legacy path).
6. Test with a user that has only a **legacy** row → GET and PATCH work; display_name/slug optional; refresh confirms persistence.

---

## 5) Code patches summary

### Files changed

| File | Change |
|------|--------|
| `docs/INSTRUCTOR_PROFILE_AUDIT.md` | New: audit, findings table, fix plan, test plan. |
| `apps/api/src/routes/instructor/profile.ts` | GET: normalize definitive `marketing_fields`/`operational_fields` to unified (snake_case, flat). Legacy: accept and pass `display_name`, `slug` in validateLegacyPatch and extended update. Legacy GET/PATCH response includes `display_name`, `slug`. |
| `packages/db/src/instructor_profile_repository.ts` | `InstructorProfile`: add `display_name?`, `slug?`. `UpdateInstructorProfileByUserIdExtendedParams`: add `display_name?`, `slug?`. `getInstructorProfileByUserId`: SELECT display_name, slug. `updateInstructorProfileByUserIdExtended`: SET display_name, slug; RETURNING includes them. |
| `apps/instructor/app/instructor/(app)/profile/page.tsx` | Pass `onSaved={(p) => setProfile(p)}` to ProfileForm. |
| `apps/instructor/lib/instructorApi.ts` | `UpdateInstructorProfileParams`: add `display_name?`, `slug?`. |
| `apps/instructor/components/ProfileForm.tsx` | State and fields for display_name, slug. Identity save sends display_name/slug (undefined when empty). Sync from profile in useEffect. |

### Legacy `same_day_booking_allowed`

`validateLegacyPatch` already validates `operational_fields.same_day_booking_allowed` as boolean (profile.ts L81–84). No change.
