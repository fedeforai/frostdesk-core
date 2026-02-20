import { sql } from './client.js';

/**
 * Retrieves system health snapshot data.
 * 
 * WHAT IT DOES:
 * - Aggregates AI status, quotas, and activity metrics
 * - Returns read-only snapshot for admin dashboard
 * - Each query is independently wrapped in try/catch for resilience
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No business logic
 * - No admin guards
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function getSystemHealthSnapshot(): Promise<{
  ai_global_enabled: boolean;
  ai_whatsapp_enabled: boolean;
  emergency_disabled: boolean;
  quota: {
    channel: 'whatsapp';
    limit: number | null;
    used_today: number | null;
    percentage: number | null;
    status: 'ok' | 'exceeded' | 'not_configured';
  };
  activity_today: {
    conversations_ai_eligible: number;
    escalations: number;
    drafts_generated: number;
    drafts_sent: number;
  };
}> {
  type EnabledRow = { enabled: boolean };
  type QuotaRow = { max_allowed: number; used: number };
  type CountRow = { count: bigint };

  const [
    aiEnabledResult,
    aiWhatsAppEnabledResult,
    quotaResult,
    aiEligibleResult,
    escalationsResult,
    draftsGeneratedResult,
    draftsSentResult,
  ] = await Promise.all([
    safe(
      () => sql<EnabledRow[]>`SELECT enabled FROM feature_flags WHERE key = 'ai_enabled' LIMIT 1`,
      [] as EnabledRow[],
    ),
    safe(
      () => sql<EnabledRow[]>`SELECT enabled FROM feature_flags WHERE key = 'ai_whatsapp_enabled' LIMIT 1`,
      [] as EnabledRow[],
    ),
    safe(
      () => sql<QuotaRow[]>`SELECT max_allowed, used FROM ai_channel_quotas WHERE channel = 'whatsapp' AND period = CURRENT_DATE LIMIT 1`,
      [] as QuotaRow[],
    ),
    safe(
      () => sql<CountRow[]>`SELECT COUNT(DISTINCT c.id)::bigint AS count FROM conversations c WHERE DATE(c.created_at) = CURRENT_DATE AND c.status = 'open'`,
      [] as CountRow[],
    ),
    safe(
      () => sql<CountRow[]>`SELECT COUNT(DISTINCT c.id)::bigint AS count FROM conversations c WHERE DATE(c.created_at) = CURRENT_DATE AND c.status = 'requires_human'`,
      [] as CountRow[],
    ),
    safe(
      () => sql<CountRow[]>`SELECT COUNT(*)::bigint AS count FROM message_metadata mm WHERE mm.key = 'ai_draft' AND DATE(mm.created_at) = CURRENT_DATE`,
      [] as CountRow[],
    ),
    safe(
      () => sql<CountRow[]>`SELECT COUNT(*)::bigint AS count FROM messages m WHERE m.direction = 'outbound' AND m.sender_identity = 'human' AND m.raw_payload::text LIKE '%draft_metadata%' AND DATE(m.created_at) = CURRENT_DATE`,
      [] as CountRow[],
    ),
  ]);

  const ai_global_enabled = aiEnabledResult.length > 0 ? aiEnabledResult[0].enabled : false;
  const ai_whatsapp_enabled = aiWhatsAppEnabledResult.length > 0 ? aiWhatsAppEnabledResult[0].enabled : false;
  const emergency_disabled = process.env.AI_EMERGENCY_DISABLE === 'true';

  let quota: {
    channel: 'whatsapp';
    limit: number | null;
    used_today: number | null;
    percentage: number | null;
    status: 'ok' | 'exceeded' | 'not_configured';
  };

  if (quotaResult.length === 0) {
    quota = { channel: 'whatsapp', limit: null, used_today: null, percentage: null, status: 'not_configured' };
  } else {
    const q = quotaResult[0];
    const percentage = q.max_allowed > 0 ? Math.round((q.used / q.max_allowed) * 100) : null;
    quota = {
      channel: 'whatsapp',
      limit: q.max_allowed,
      used_today: q.used,
      percentage,
      status: q.used >= q.max_allowed ? 'exceeded' : 'ok',
    };
  }

  return {
    ai_global_enabled,
    ai_whatsapp_enabled,
    emergency_disabled,
    quota,
    activity_today: {
      conversations_ai_eligible: Number(aiEligibleResult[0]?.count || 0),
      escalations: Number(escalationsResult[0]?.count || 0),
      drafts_generated: Number(draftsGeneratedResult[0]?.count || 0),
      drafts_sent: Number(draftsSentResult[0]?.count || 0),
    },
  };
}
