# STEP 4.1 — Manual test checklist (Loop 1–3)

Assumes API base URL `BASE` (e.g. `http://localhost:3000`) and a valid instructor JWT in `TOKEN`.

## 1. GET /instructor/conversations/:id/draft

- **401 without token**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" "$BASE/instructor/conversations/CONV_ID/draft"
  # expect 401
  ```
- **With token, conversation not owned → 404**
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE/instructor/conversations/<other-instructor-conv-id>/draft"
  # expect 404
  ```
- **With token, owned conversation, no draft → 200, draft: null**
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE/instructor/conversations/<your-conv-id>/draft"
  # expect {"ok":true,"draft":null}
  ```

## 2. POST /instructor/drafts/:draftId/use

- **401 without token** — omit `Authorization`; expect 401.
- **400 missing finalText**
  ```bash
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{}' "$BASE/instructor/drafts/$DRAFT_ID/use"
  # expect 400, missing_text
  ```
- **404 draft not found / not owned** — use a random UUID or another instructor’s draft id; expect 404.
- **Success** — create a draft first (via repo or SQL), then:
  ```bash
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"edited":false,"finalText":"Hello, this is the exact draft text"}' "$BASE/instructor/drafts/$DRAFT_ID/use"
  # expect {"ok":true}
  ```
- **Pass/Fail**: After use, `instructor_draft_events` has one row with `event_type` = `ai_draft_used_exact` or `ai_draft_used_edited`.

## 3. POST /instructor/drafts/:draftId/ignore

- **401 without token** — expect 401.
- **404 draft not found / not owned** — expect 404.
- **Success**
  ```bash
  curl -s -X POST -H "Authorization: Bearer $TOKEN" "$BASE/instructor/drafts/$DRAFT_ID/ignore"
  # expect {"ok":true}
  ```
- **Pass/Fail**: After ignore, draft state = ignored and `instructor_draft_events` has `ai_draft_ignored`.

## 4. GET /instructor/kpis/summary?window=7d

- **401 without token**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" "$BASE/instructor/kpis/summary?window=7d"
  # expect 401
  ```
- **403 onboarding not completed** — use token for instructor without `onboarding_completed_at`; expect 403.
- **Success**
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE/instructor/kpis/summary?window=7d"
  # expect {"ok":true,"window":"7d","drafts":{"generated":N,"usedExact":...,"usedEdited":...,"used":...,"ignored":...,"expired":0,"usageRate":...}}
  ```
- **window=30d** — same with `?window=30d`; `window` in response should be `30d`.

## Quick DB checks (Loop 1)

```sql
SELECT * FROM public.ai_drafts LIMIT 1;
SELECT * FROM public.instructor_draft_events LIMIT 1;
-- Partial unique index:
SELECT indexname FROM pg_indexes WHERE indexname = 'uniq_ai_drafts_one_proposed';
```
