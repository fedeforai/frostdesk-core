import { getAIQuotaStatus } from './ai_quota_repository.js';

/**
 * Checks if AI quota is available for a channel.
 * 
 * WHAT IT DOES:
 * - Gets today's date (UTC, YYYY-MM-DD)
 * - Fetches quota status from repository
 * - Returns allowed status and reason
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No quota increment
 * - No error handling
 * 
 * Logic:
 * - If no quota row exists → not_configured
 * - If used >= max_allowed → quota_exceeded
 * - Else → ok
 * 
 * @param params - Channel to check
 * @returns Allowed status and reason
 */
export async function isAIQuotaAvailable(params: {
  channel: string;
}): Promise<{
  allowed: boolean;
  reason: 'ok' | 'quota_exceeded' | 'not_configured';
}> {
  const { channel } = params;

  const today = new Date();
  const period = today.toISOString().split('T')[0];

  const quota = await getAIQuotaStatus({
    channel,
    period,
  });

  if (!quota) {
    return {
      allowed: false,
      reason: 'not_configured',
    };
  }

  if (quota.used >= quota.max_allowed) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
    };
  }

  return {
    allowed: true,
    reason: 'ok',
  };
}
