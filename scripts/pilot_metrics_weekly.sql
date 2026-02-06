-- Pilot Metrics Weekly (Prompt 3 — market-aligned)
-- Usage: Replace :start_ts and :end_ts with your range (e.g. now() - interval '7 days', now()), then run.
-- No PII; audit_log only. Postgres-compatible.

-- =============================================================================
-- 1️⃣ AI Draft Adoption Rate — ai_draft_approved / ai_draft_generated
-- Target: ≥40% valore percepito, <25% problema
-- =============================================================================
WITH gen AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_generated'
    AND created_at >= :start_ts AND created_at < :end_ts
),
approved AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_approved'
    AND created_at >= :start_ts AND created_at < :end_ts
)
SELECT
  (SELECT n FROM gen) AS drafts_generated,
  (SELECT n FROM approved) AS drafts_approved,
  CASE WHEN (SELECT n FROM gen) > 0
    THEN round(100.0 * (SELECT n FROM approved) / (SELECT n FROM gen), 2)
    ELSE NULL END AS adoption_rate_pct;

-- =============================================================================
-- 2️⃣ AI Draft Skip Reasons (Distribution)
-- Target: confidence_low + intent_non_operative > 60% bene; quality_blocked > 20% rivedere guardrail
-- =============================================================================
SELECT
  coalesce(payload->>'reason', 'unknown') AS reason,
  count(*) AS cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 2) AS pct
FROM audit_log
WHERE action = 'ai_draft_skipped'
  AND created_at >= :start_ts AND created_at < :end_ts
GROUP BY payload->>'reason'
ORDER BY cnt DESC;

-- =============================================================================
-- 3️⃣ Human Escalation Rate — conversations_with_human_action / total_active_conversations
-- Target: 30–60% escalation sano nel pilot (proxy: ai_draft_approved, admin_send_ai_draft, admin_override_booking_status)
-- =============================================================================
WITH active AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE action = 'inbound_message_received' AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= :start_ts AND created_at < :end_ts
),
handled AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE action IN ('ai_draft_approved', 'admin_send_ai_draft', 'admin_override_booking_status')
    AND entity_id IS NOT NULL
    AND created_at >= :start_ts AND created_at < :end_ts
)
SELECT
  (SELECT n FROM active) AS total_active_conversations,
  (SELECT n FROM handled) AS conversations_with_human_action,
  CASE WHEN (SELECT n FROM active) > 0
    THEN round(100.0 * (SELECT n FROM handled) / (SELECT n FROM active), 2)
    ELSE NULL END AS escalation_rate_pct;

-- =============================================================================
-- 4️⃣ Time-to-First-Action (TTFA) — inbound -> first ai_draft_generated | ai_draft_approved
-- Target: trend ↓ settimana su settimana
-- =============================================================================
WITH conv_first_inbound AS (
  SELECT entity_id AS cid, min(created_at) AS t0
  FROM audit_log
  WHERE action = 'inbound_message_received' AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= :start_ts AND created_at < :end_ts
  GROUP BY entity_id
),
conv_first_action AS (
  SELECT entity_id AS cid, min(created_at) AS t1
  FROM audit_log
  WHERE action IN ('ai_draft_generated', 'ai_draft_approved') AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= :start_ts AND created_at < :end_ts
  GROUP BY entity_id
),
diffs AS (
  SELECT extract(epoch FROM (a.t1 - i.t0)) / 60.0 AS minutes
  FROM conv_first_inbound i
  JOIN conv_first_action a ON a.cid = i.cid
  WHERE a.t1 >= i.t0
)
SELECT
  count(*) AS n_conversations,
  round(avg(minutes)::numeric, 2) AS avg_minutes_ttfa,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes)::numeric, 2) AS median_minutes_ttfa
FROM diffs;

-- =============================================================================
-- 5️⃣ Draft Quality Signals — was_truncated %, avg violations_count (no PII)
-- Target: was_truncated < 50%; violations_count stabile o in calo
-- =============================================================================
SELECT
  count(*) AS total_drafts,
  count(*) FILTER (WHERE (payload->>'was_truncated') = 'true') AS truncated_count,
  round(100.0 * count(*) FILTER (WHERE (payload->>'was_truncated') = 'true') / nullif(count(*), 0), 2) AS was_truncated_pct,
  round(avg(NULLIF(payload->>'violations_count', '')::numeric), 2) AS avg_violations_count
FROM audit_log
WHERE action = 'ai_draft_generated'
  AND created_at >= :start_ts AND created_at < :end_ts;

-- =============================================================================
-- 6️⃣ Admin Override Density — admin_* actions / total active conversations
-- Target: alto all'inizio ok; deve scendere col tempo
-- =============================================================================
WITH admin_actions AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action LIKE 'admin_%'
    AND created_at >= :start_ts AND created_at < :end_ts
),
active_conversations AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= :start_ts AND created_at < :end_ts
)
SELECT
  (SELECT n FROM admin_actions) AS admin_override_actions,
  (SELECT n FROM active_conversations) AS total_active_conversations,
  CASE WHEN (SELECT n FROM active_conversations) > 0
    THEN round((SELECT n FROM admin_actions)::numeric / (SELECT n FROM active_conversations), 2)
    ELSE NULL END AS admin_override_density;

-- =============================================================================
-- Error rate (optional): ai_draft_skipped(reason=error) / inbound_message_received
-- =============================================================================
WITH err AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_skipped' AND payload->>'reason' = 'error'
    AND created_at >= :start_ts AND created_at < :end_ts
),
inb AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'inbound_message_received'
    AND created_at >= :start_ts AND created_at < :end_ts
)
SELECT
  (SELECT n FROM err) AS draft_skipped_error,
  (SELECT n FROM inb) AS inbound_logged,
  CASE WHEN (SELECT n FROM inb) > 0 THEN round(100.0 * (SELECT n FROM err) / (SELECT n FROM inb), 4) ELSE NULL END AS error_rate_pct;
