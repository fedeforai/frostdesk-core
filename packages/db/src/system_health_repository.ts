import { sql } from './client.js';

/**
 * Retrieves system health snapshot data.
 * 
 * WHAT IT DOES:
 * - Aggregates AI status, quotas, and activity metrics
 * - Returns read-only snapshot for admin dashboard
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No business logic
 * - No admin guards
 */
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
  // AI Global Status (from feature flags)
  const aiEnabledResult = await sql<Array<{ enabled: boolean }>>`
    SELECT enabled
    FROM feature_flags
    WHERE key = 'ai_enabled'
    LIMIT 1
  `;
  const ai_global_enabled = aiEnabledResult.length > 0 ? aiEnabledResult[0].enabled : false;

  // AI WhatsApp Enabled (from feature flags)
  const aiWhatsAppEnabledResult = await sql<Array<{ enabled: boolean }>>`
    SELECT enabled
    FROM feature_flags
    WHERE key = 'ai_whatsapp_enabled'
    LIMIT 1
  `;
  const ai_whatsapp_enabled = aiWhatsAppEnabledResult.length > 0 ? aiWhatsAppEnabledResult[0].enabled : false;

  // ENV Emergency Kill Switch
  const emergency_disabled = process.env.AI_EMERGENCY_DISABLE === 'true';

  // Quota for whatsapp channel (today)
  const quotaResult = await sql<Array<{
    max_allowed: number;
    used: number;
  }>>`
    SELECT max_allowed, used
    FROM ai_channel_quotas
    WHERE channel = 'whatsapp'
      AND period = CURRENT_DATE
    LIMIT 1
  `;

  let quota: {
    channel: 'whatsapp';
    limit: number | null;
    used_today: number | null;
    percentage: number | null;
    status: 'ok' | 'exceeded' | 'not_configured';
  };

  if (quotaResult.length === 0) {
    quota = {
      channel: 'whatsapp',
      limit: null,
      used_today: null,
      percentage: null,
      status: 'not_configured',
    };
  } else {
    const q = quotaResult[0];
    const percentage = q.max_allowed > 0 ? Math.round((q.used / q.max_allowed) * 100) : null;
    const status: 'ok' | 'exceeded' | 'not_configured' = 
      q.used >= q.max_allowed ? 'exceeded' : 'ok';
    
    quota = {
      channel: 'whatsapp',
      limit: q.max_allowed,
      used_today: q.used,
      percentage,
      status,
    };
  }

  // Activity Today: AI-eligible conversations (created today with status='open')
  const aiEligibleResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT c.id)::bigint AS count
    FROM conversations c
    WHERE DATE(c.created_at) = CURRENT_DATE
      AND c.status = 'open'
  `;
  const conversations_ai_eligible = Number(aiEligibleResult[0]?.count || 0);

  // Activity Today: Escalations (conversations with status='requires_human' created today)
  const escalationsResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT c.id)::bigint AS count
    FROM conversations c
    WHERE DATE(c.created_at) = CURRENT_DATE
      AND c.status = 'requires_human'
  `;
  const escalations = Number(escalationsResult[0]?.count || 0);

  // Activity Today: Drafts generated
  const draftsGeneratedResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM message_metadata mm
    WHERE mm.key = 'ai_draft'
      AND DATE(mm.created_at) = CURRENT_DATE
  `;
  const drafts_generated = Number(draftsGeneratedResult[0]?.count || 0);

  // Activity Today: Drafts sent (outbound messages with sender_identity='human' and raw_payload contains draft_metadata)
  const draftsSentResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM messages m
    WHERE m.direction = 'outbound'
      AND m.sender_identity = 'human'
      AND m.raw_payload::text LIKE '%draft_metadata%'
      AND DATE(m.created_at) = CURRENT_DATE
  `;
  const drafts_sent = Number(draftsSentResult[0]?.count || 0);

  return {
    ai_global_enabled,
    ai_whatsapp_enabled,
    emergency_disabled,
    quota,
    activity_today: {
      conversations_ai_eligible,
      escalations,
      drafts_generated,
      drafts_sent,
    },
  };
}
