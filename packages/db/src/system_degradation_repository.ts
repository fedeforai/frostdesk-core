import { sql } from './client.js';

/**
 * Retrieves system degradation signals over the last 24 hours.
 * 
 * WHAT IT DOES:
 * - Aggregates error counts and timestamps
 * - Returns read-only degradation signals
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No reactions
 * - No decisions
 * - No business logic
 */
export async function getSystemDegradationSignals(): Promise<{
  webhook: {
    inbound_received_24h: number;
    inbound_errors_24h: number;
    last_error_at: string | null;
  };
  ai_drafts: {
    drafts_generated_24h: number;
    draft_errors_24h: number;
  };
  quota: {
    quota_exceeded_24h: number;
    last_quota_block_at: string | null;
  };
  escalation: {
    escalations_24h: number;
  };
}> {
  // Webhook: inbound_received_24h
  const inboundReceivedResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM messages
    WHERE direction = 'inbound'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const inbound_received_24h = Number(inboundReceivedResult[0]?.count || 0);

  // Webhook: inbound_errors_24h and last_error_at
  const inboundErrorsResult = await sql<Array<{
    count: bigint;
    last_error_at: string | null;
  }>>`
    SELECT 
      COUNT(*)::bigint AS count,
      MAX(created_at)::text AS last_error_at
    FROM message_metadata
    WHERE key = 'webhook_error'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const inbound_errors_24h = Number(inboundErrorsResult[0]?.count || 0);
  const last_error_at = inboundErrorsResult[0]?.last_error_at || null;

  // AI drafts: drafts_generated_24h
  const draftsGeneratedResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM message_metadata
    WHERE key = 'ai_draft'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const drafts_generated_24h = Number(draftsGeneratedResult[0]?.count || 0);

  // AI drafts: draft_errors_24h
  const draftErrorsResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM message_metadata
    WHERE key = 'ai_draft_error'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const draft_errors_24h = Number(draftErrorsResult[0]?.count || 0);

  // Quota: quota_exceeded_24h and last_quota_block_at (from booking_audit_log)
  const quotaExceededResult = await sql<Array<{
    count: bigint;
    last_block_at: string | null;
  }>>`
    SELECT 
      COUNT(*)::bigint AS count,
      MAX(created_at)::text AS last_block_at
    FROM booking_audit_log
    WHERE action = 'ai_quota_exceeded'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const quota_exceeded_24h = Number(quotaExceededResult[0]?.count || 0);
  const last_quota_block_at = quotaExceededResult[0]?.last_block_at || null;

  // Escalation: escalations_24h
  const escalationsResult = await sql<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM booking_audit_log
    WHERE action = 'escalation_triggered'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const escalations_24h = Number(escalationsResult[0]?.count || 0);

  return {
    webhook: {
      inbound_received_24h,
      inbound_errors_24h,
      last_error_at,
    },
    ai_drafts: {
      drafts_generated_24h,
      draft_errors_24h,
    },
    quota: {
      quota_exceeded_24h,
      last_quota_block_at,
    },
    escalation: {
      escalations_24h,
    },
  };
}
