import { sql } from './client.js';

/**
 * Comprehensive Admin Dashboard — single read-only snapshot.
 *
 * Consolidates: dashboard metrics, KPI snapshot, system health,
 * degradation signals, AI usage, instructor usage, and recent audit events.
 *
 * EVERY query is wrapped in .catch() so that missing tables/columns
 * never crash the entire dashboard — graceful degradation per-metric.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComprehensiveDashboard {
  system: {
    ai_global_enabled: boolean;
    ai_whatsapp_enabled: boolean;
    emergency_disabled: boolean;
    pilot_instructor_count: number;
    pilot_max: number;
    quota: {
      channel: 'whatsapp';
      limit: number | null;
      used_today: number | null;
      percentage: number | null;
      status: 'ok' | 'exceeded' | 'not_configured';
    };
  };

  today: {
    conversations_new: number;
    conversations_open: number;
    messages_inbound: number;
    messages_outbound: number;
    bookings_created: number;
    bookings_cancelled: number;
    customer_notes_added: number;
    human_overrides: number;
  };

  yesterday: {
    conversations_open: number;
    escalations: number;
    draft_approval_rate: number | null;
    draft_errors: number;
    bookings_created: number;
    instructors_online: number;
  };

  ai: {
    drafts_generated_today: number;
    drafts_sent_today: number;
    drafts_pending: number;
    draft_approval_rate: number | null;
    draft_errors_today: number;
    escalations_today: number;
    conversations_ai_eligible_today: number;
    avg_latency_ms_7d: number;
    total_cost_cents_7d: number;
    total_calls_7d: number;
    error_rate_7d: number;
  };

  instructors: {
    total_profiles: number;
    onboarded_profiles: number;
    active_7d: number;
    pilot_count: number;
    total_bookings: number;
    active_bookings: number;
    bookings_by_status: Array<{ status: string; count: number }>;
    bookings_created_7d: number;
    customer_notes_7d: number;
  };

  presence: {
    online_now: number;
    last_30m: number;
    offline: number;
  };

  user_access: {
    logins_today: number;
    unique_users_today: number;
    active_sessions: number;
    logouts_today: number;
  };

  health_24h: {
    webhook_inbound: number;
    webhook_errors: number;
    webhook_last_error_at: string | null;
    ai_draft_errors: number;
    quota_exceeded: number;
    escalations: number;
  };

  recent_events: Array<{
    id: string;
    created_at: string;
    actor_type: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    severity: string;
  }>;

  ai_adoption: {
    toggles_on_today: number;
    toggles_off_today: number;
    toggles_7d_total: number;
    toggles_grouped_by_instructor_7d: Array<{ instructor_id: string; toggles: number }>;
    recent_ai_behavior_events: Array<{
      created_at: string;
      instructor_id: string;
      action: string;
      new_state: boolean;
    }>;
  };

  generated_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  return 0;
}

function parsePilotCount(): number {
  const raw = process.env.PILOT_INSTRUCTOR_IDS ?? '';
  if (!raw.trim()) return 0;
  return raw.split(',').filter((s) => s.trim().length > 0).length;
}

function parsePilotMax(): number {
  const raw = process.env.PILOT_MAX_INSTRUCTORS ?? '';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

/** Safely run a SQL query; return fallback on any error (missing table/column). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safe<T>(promise: Promise<T>, fallback: any): Promise<T> {
  return promise.catch(() => fallback as T);
}

const ZERO = [{ count: '0' }] as Array<{ count: string }>;

// ── Main query ───────────────────────────────────────────────────────────────

export async function getComprehensiveDashboard(): Promise<ComprehensiveDashboard> {
  const [
    featureFlags,
    quotaRow,
    todayConvs,
    todayMsgs,
    todayBookings,
    todayCancelled,
    todayNotes,
    todayOverrides,
    aiDraftsGenerated,
    aiDraftsSent,
    aiDraftsPending,
    aiDraftErrors,
    aiEscalations,
    aiEligible,
    aiUsage7d,
    instructorTotal,
    instructorOnboarded,
    instructorActive7d,
    totalBookings,
    activeBookings,
    bookingsByStatus,
    bookingsCreated7d,
    customerNotes7d,
    webhookInbound24h,
    webhookErrors24h,
    aiDraftErrors24h,
    quotaExceeded24h,
    escalations24h,
    recentEvents,
    // Yesterday deltas
    yesterdayConvsOpen,
    yesterdayEscalations,
    yesterdayDrafts,
    yesterdayDraftErrors,
    yesterdayBookings,
    // Presence
    presenceRow,
    // User access
    userAccessRow,
    activeSessions,
    // Yesterday presence
    yesterdayPresence,
    // AI adoption (ai_behavior_events)
    aiTogglesOnToday,
    aiTogglesOffToday,
    aiToggles7dTotal,
    aiTogglesGrouped7d,
    recentAiBehaviorEvents,
  ] = await Promise.all([
    // ── System ─────────────────────────────────
    safe(
      sql<Array<{ key: string; enabled: boolean }>>`
        SELECT key, enabled FROM feature_flags WHERE key IN ('ai_enabled', 'ai_whatsapp_enabled')
      `,
      [] as Array<{ key: string; enabled: boolean }>,
    ),
    safe(
      sql<Array<{ max_allowed: number; used: number }>>`
        SELECT max_allowed, used FROM ai_channel_quotas
        WHERE channel = 'whatsapp' AND period = CURRENT_DATE LIMIT 1
      `,
      [] as Array<{ max_allowed: number; used: number }>,
    ),

    // ── Today KPIs ─────────────────────────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM conversations WHERE DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ inbound: string; outbound: string }>>`
        SELECT
          COUNT(*) FILTER (WHERE direction = 'inbound')::int AS inbound,
          COUNT(*) FILTER (WHERE direction = 'outbound')::int AS outbound
        FROM messages WHERE DATE(created_at) = CURRENT_DATE
      `,
      [{ inbound: '0', outbound: '0' }],
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings WHERE DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE status = 'cancelled' AND DATE(updated_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM audit_log
        WHERE action = 'customer_note_added' AND DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM booking_audit
        WHERE actor = 'human' AND DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),

    // ── AI Performance ─────────────────────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM message_metadata
        WHERE key = 'ai_draft' AND DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM messages
        WHERE direction = 'outbound' AND sender_identity = 'human'
          AND raw_payload::text LIKE '%draft_metadata%' AND DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT mm.conversation_id)::int AS count FROM message_metadata mm
        WHERE mm.key = 'ai_draft' AND NOT EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = mm.conversation_id
            AND m.direction = 'outbound' AND (m.sender_identity = 'human' OR m.sender_identity = 'ai')
        )
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM message_metadata
        WHERE key = 'ai_draft_error' AND DATE(created_at) = CURRENT_DATE
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT c.id)::int AS count FROM conversations c
        WHERE DATE(c.created_at) = CURRENT_DATE AND c.status = 'requires_human'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT c.id)::int AS count FROM conversations c
        WHERE DATE(c.created_at) = CURRENT_DATE AND c.status = 'open'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ total_calls: string; total_cost_cents: string; avg_latency: string; error_count: string }>>`
        SELECT
          COUNT(*)::int AS total_calls,
          COALESCE(SUM(cost_estimate_cents), 0)::int AS total_cost_cents,
          COALESCE(AVG(latency_ms), 0)::int AS avg_latency,
          COUNT(*) FILTER (WHERE error_code IS NOT NULL)::int AS error_count
        FROM ai_usage_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `,
      [{ total_calls: '0', total_cost_cents: '0', avg_latency: '0', error_count: '0' }],
    ),

    // ── Instructors ────────────────────────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM instructor_profiles
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM instructor_profiles
        WHERE approval_status = 'approved'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT actor_id)::int AS count FROM audit_log
        WHERE actor_type = 'instructor' AND created_at >= NOW() - INTERVAL '7 days'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings WHERE status IN ('pending', 'confirmed')
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ status: string; count: string }>>`
        SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status ORDER BY count DESC
      `,
      [] as Array<{ status: string; count: string }>,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings WHERE created_at >= NOW() - INTERVAL '7 days'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM customer_notes
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `,
      ZERO,
    ),

    // ── Health 24h ─────────────────────────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM messages
        WHERE direction = 'inbound' AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string; last_error_at: string | null }>>`
        SELECT COUNT(*)::int AS count, MAX(created_at)::text AS last_error_at
        FROM message_metadata WHERE key = 'webhook_error' AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      [{ count: '0', last_error_at: null }],
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM message_metadata
        WHERE key = 'ai_draft_error' AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM booking_audit_log
        WHERE action = 'ai_quota_exceeded' AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM booking_audit_log
        WHERE action = 'escalation_triggered' AND created_at >= NOW() - INTERVAL '24 hours'
      `,
      ZERO,
    ),

    // ── Recent audit events ────────────────────
    safe(
      sql<Array<{
        id: string;
        created_at: string;
        actor_type: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        severity: string;
      }>>`
        SELECT id, created_at, actor_type, actor_id, action, entity_type, entity_id, severity
        FROM audit_log ORDER BY created_at DESC LIMIT 15
      `,
      [],
    ),

    // ── Yesterday deltas (6 core KPIs) ──────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT c.id)::int AS count FROM conversations c
        WHERE DATE(c.created_at) = CURRENT_DATE - 1 AND c.status = 'open'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT c.id)::int AS count FROM conversations c
        WHERE DATE(c.created_at) = CURRENT_DATE - 1 AND c.status = 'requires_human'
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ gen: string; sent: string }>>`
        SELECT
          COUNT(*) FILTER (WHERE key = 'ai_draft')::int AS gen,
          0::int AS sent
        FROM message_metadata WHERE DATE(created_at) = CURRENT_DATE - 1
      `,
      [{ gen: '0', sent: '0' }],
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM message_metadata
        WHERE key = 'ai_draft_error' AND DATE(created_at) = CURRENT_DATE - 1
      `,
      ZERO,
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE DATE(created_at) = CURRENT_DATE - 1
      `,
      ZERO,
    ),

    // ── Instructor presence (auth.sessions) ─────
    safe(
      sql<Array<{ online_now: string; last_30m: string }>>`
        SELECT
          COUNT(DISTINCT s.user_id) FILTER (WHERE s.refreshed_at >= NOW() - INTERVAL '5 minutes')::int AS online_now,
          COUNT(DISTINCT s.user_id) FILTER (WHERE s.refreshed_at >= NOW() - INTERVAL '30 minutes')::int AS last_30m
        FROM auth.sessions s
        INNER JOIN instructor_profiles ip ON ip.id = s.user_id
        WHERE (s.not_after IS NULL OR s.not_after > NOW())
      `,
      [{ online_now: '0', last_30m: '0' }],
    ),

    // ── User access (auth.audit_log_entries + sessions) ──
    safe(
      sql<Array<{ logins: string; unique_users: string; logouts: string }>>`
        SELECT
          COUNT(*) FILTER (WHERE payload->>'action' IN ('login', 'token_refreshed'))::int AS logins,
          COUNT(DISTINCT COALESCE(payload->>'actor_id', payload->'actor'->>'id')) FILTER (WHERE payload->>'action' IN ('login', 'token_refreshed'))::int AS unique_users,
          COUNT(*) FILTER (WHERE payload->>'action' = 'logout')::int AS logouts
        FROM auth.audit_log_entries
        WHERE created_at >= CURRENT_DATE
      `,
      [{ logins: '0', unique_users: '0', logouts: '0' }],
    ),
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM auth.sessions
        WHERE (not_after IS NULL OR not_after > NOW())
      `,
      ZERO,
    ),

    // ── Yesterday presence (for delta) ──────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(DISTINCT s.user_id)::int AS count
        FROM auth.sessions s
        INNER JOIN instructor_profiles ip ON ip.id = s.user_id
        WHERE s.refreshed_at >= (CURRENT_DATE - 1) AND s.refreshed_at < CURRENT_DATE
      `,
      ZERO,
    ),

    // ── AI adoption: toggles today (on) ─────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM public.ai_behavior_events
        WHERE action = 'ai_whatsapp_toggled' AND (metadata->>'new_state') = 'true'
          AND created_at >= CURRENT_DATE
      `,
      ZERO,
    ),
    // ── AI adoption: toggles today (off) ────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM public.ai_behavior_events
        WHERE action = 'ai_whatsapp_toggled' AND (metadata->>'new_state') = 'false'
          AND created_at >= CURRENT_DATE
      `,
      ZERO,
    ),
    // ── AI adoption: toggles 7d total ───────────
    safe(
      sql<Array<{ count: string }>>`
        SELECT COUNT(*)::int AS count FROM public.ai_behavior_events
        WHERE action = 'ai_whatsapp_toggled'
          AND created_at >= NOW() - INTERVAL '7 days'
      `,
      ZERO,
    ),
    // ── AI adoption: grouped by instructor 7d ────
    safe(
      sql<Array<{ instructor_id: string; toggles: string }>>`
        SELECT instructor_id::text, COUNT(*)::int AS toggles
        FROM public.ai_behavior_events
        WHERE action = 'ai_whatsapp_toggled'
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY instructor_id
        ORDER BY toggles DESC
        LIMIT 20
      `,
      [],
    ),
    // ── AI adoption: recent events ───────────────
    safe(
      sql<Array<{ created_at: string; instructor_id: string; action: string; new_state: string | null }>>`
        SELECT created_at::text, instructor_id::text, action,
          (metadata->>'new_state') AS new_state
        FROM public.ai_behavior_events
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [],
    ),
  ]);

  // ── Parse feature flags ──────────────────────────────────────────────────
  const flagMap = Object.fromEntries(featureFlags.map((f) => [f.key, f.enabled]));
  const ai_global_enabled = flagMap['ai_enabled'] ?? false;
  const ai_whatsapp_enabled = flagMap['ai_whatsapp_enabled'] ?? false;

  // ── Parse quota ──────────────────────────────────────────────────────────
  let quota: ComprehensiveDashboard['system']['quota'];
  if (quotaRow.length === 0) {
    quota = { channel: 'whatsapp', limit: null, used_today: null, percentage: null, status: 'not_configured' };
  } else {
    const q = quotaRow[0];
    const pct = q.max_allowed > 0 ? Math.round((q.used / q.max_allowed) * 100) : null;
    quota = {
      channel: 'whatsapp',
      limit: q.max_allowed,
      used_today: q.used,
      percentage: pct,
      status: q.used >= q.max_allowed ? 'exceeded' : 'ok',
    };
  }

  // ── AI usage 7d ──────────────────────────────────────────────────────────
  const u = aiUsage7d[0] ?? { total_calls: '0', total_cost_cents: '0', avg_latency: '0', error_count: '0' };
  const totalCalls7d = num(u.total_calls);
  const errorCount7d = num(u.error_count);

  // ── Draft approval rate ──────────────────────────────────────────────────
  const genToday = num(aiDraftsGenerated[0]?.count);
  const sentToday = num(aiDraftsSent[0]?.count);
  const approvalRate = genToday > 0 ? Math.round((sentToday / genToday) * 100) : null;

  // ── Today conversations open ─────────────────────────────────────────────
  const conversations_open = num(aiEligible[0]?.count) + num(aiEscalations[0]?.count);

  // ── Yesterday delta calculations ─────────────────────────────────────────
  const yGenToday = num((yesterdayDrafts[0] as any)?.gen);
  const ySentToday = num((yesterdayDrafts[0] as any)?.sent);
  const yApprovalRate = yGenToday > 0 ? Math.round((ySentToday / yGenToday) * 100) : null;

  // ── Presence ─────────────────────────────────────────────────────────────
  const pr = presenceRow[0] ?? { online_now: '0', last_30m: '0' };
  const onlineNow = num(pr.online_now);
  const last30m = num(pr.last_30m);
  const totalProfiles = num(instructorTotal[0]?.count);

  // ── User access ──────────────────────────────────────────────────────────
  const ua = userAccessRow[0] ?? { logins: '0', unique_users: '0', logouts: '0' };

  return {
    system: {
      ai_global_enabled,
      ai_whatsapp_enabled,
      emergency_disabled: process.env.AI_EMERGENCY_DISABLE === 'true',
      pilot_instructor_count: parsePilotCount(),
      pilot_max: parsePilotMax(),
      quota,
    },

    today: {
      conversations_new: num(todayConvs[0]?.count),
      conversations_open,
      messages_inbound: num(todayMsgs[0]?.inbound),
      messages_outbound: num(todayMsgs[0]?.outbound),
      bookings_created: num(todayBookings[0]?.count),
      bookings_cancelled: num(todayCancelled[0]?.count),
      customer_notes_added: num(todayNotes[0]?.count),
      human_overrides: num(todayOverrides[0]?.count),
    },

    yesterday: {
      conversations_open: num(yesterdayConvsOpen[0]?.count),
      escalations: num(yesterdayEscalations[0]?.count),
      draft_approval_rate: yApprovalRate,
      draft_errors: num(yesterdayDraftErrors[0]?.count),
      bookings_created: num(yesterdayBookings[0]?.count),
      instructors_online: num(yesterdayPresence[0]?.count),
    },

    ai: {
      drafts_generated_today: genToday,
      drafts_sent_today: sentToday,
      drafts_pending: num(aiDraftsPending[0]?.count),
      draft_approval_rate: approvalRate,
      draft_errors_today: num(aiDraftErrors[0]?.count),
      escalations_today: num(aiEscalations[0]?.count),
      conversations_ai_eligible_today: num(aiEligible[0]?.count),
      avg_latency_ms_7d: num(u.avg_latency),
      total_cost_cents_7d: num(u.total_cost_cents),
      total_calls_7d: totalCalls7d,
      error_rate_7d: totalCalls7d > 0 ? Math.round((errorCount7d / totalCalls7d) * 100) : 0,
    },

    instructors: {
      total_profiles: totalProfiles,
      onboarded_profiles: num(instructorOnboarded[0]?.count),
      active_7d: num(instructorActive7d[0]?.count),
      pilot_count: parsePilotCount(),
      total_bookings: num(totalBookings[0]?.count),
      active_bookings: num(activeBookings[0]?.count),
      bookings_by_status: bookingsByStatus.map((r) => ({ status: r.status, count: num(r.count) })),
      bookings_created_7d: num(bookingsCreated7d[0]?.count),
      customer_notes_7d: num(customerNotes7d[0]?.count),
    },

    presence: {
      online_now: onlineNow,
      last_30m: last30m,
      offline: Math.max(0, totalProfiles - last30m),
    },

    user_access: {
      logins_today: num(ua.logins),
      unique_users_today: num(ua.unique_users),
      active_sessions: num(activeSessions[0]?.count),
      logouts_today: num(ua.logouts),
    },

    health_24h: {
      webhook_inbound: num(webhookInbound24h[0]?.count),
      webhook_errors: num(webhookErrors24h[0]?.count),
      webhook_last_error_at: (webhookErrors24h[0] as any)?.last_error_at ?? null,
      ai_draft_errors: num(aiDraftErrors24h[0]?.count),
      quota_exceeded: num(quotaExceeded24h[0]?.count),
      escalations: num(escalations24h[0]?.count),
    },

    recent_events: recentEvents.map((e) => ({
      id: e.id,
      created_at: e.created_at,
      actor_type: e.actor_type,
      actor_id: e.actor_id,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      severity: e.severity,
    })),

    ai_adoption: {
      toggles_on_today: num(aiTogglesOnToday[0]?.count),
      toggles_off_today: num(aiTogglesOffToday[0]?.count),
      toggles_7d_total: num(aiToggles7dTotal[0]?.count),
      toggles_grouped_by_instructor_7d: aiTogglesGrouped7d.map((r) => ({
        instructor_id: r.instructor_id,
        toggles: num(r.toggles),
      })),
      recent_ai_behavior_events: recentAiBehaviorEvents.map((e) => ({
        created_at: e.created_at,
        instructor_id: e.instructor_id,
        action: e.action,
        new_state: e.new_state === 'true',
      })),
    },

    generated_at: new Date().toISOString(),
  };
}
