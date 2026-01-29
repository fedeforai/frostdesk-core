import { sql } from './client.js';

/**
 * Retrieves AI quota status for a channel and period.
 * 
 * WHAT IT DOES:
 * - SELECTs quota row by (channel, period)
 * - Returns quota status or null if not found
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No mutations
 * - No side effects
 * 
 * @param params - Channel and period (YYYY-MM-DD)
 * @returns Quota status or null if not found
 */
export async function getAIQuotaStatus(params: {
  channel: string;
  period: string; // YYYY-MM-DD
}): Promise<{
  channel: string;
  period: string;
  max_allowed: number;
  used: number;
} | null> {
  const { channel, period } = params;

  const result = await sql<Array<{
    channel: string;
    period: string;
    max_allowed: number;
    used: number;
  }>>`
    SELECT 
      channel,
      period::text,
      max_allowed,
      used
    FROM ai_channel_quotas
    WHERE channel = ${channel}
      AND period = ${period}::date
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return {
    channel: result[0].channel,
    period: result[0].period,
    max_allowed: result[0].max_allowed,
    used: result[0].used,
  };
}
