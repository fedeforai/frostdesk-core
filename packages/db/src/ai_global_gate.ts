import { isFeatureEnabled } from './feature_flag_repository.js';
import { isAIEnvDisabled } from './ai_env_kill_switch.js';
import { isAIQuotaAvailable } from './ai_quota_gate.js';

/**
 * Checks if AI is enabled for a conversation.
 * 
 * WHAT IT DOES:
 * - Checks ENV emergency kill switch (absolute priority)
 * - Checks global AI feature flag
 * - Checks channel-specific feature flag if applicable
 * - Checks channel quota availability
 * - Returns true only if all checks pass
 * 
 * WHAT IT DOES NOT DO:
 * - No DB writes
 * - No side effects
 * - No error handling
 * - No caching
 * 
 * Logic order (MANDATORY):
 * 1. Check ENV kill switch → if disabled, return false
 * 2. Check 'ai_enabled' → if false, return false
 * 3. If channel === 'whatsapp', check 'ai_whatsapp_enabled' → if false, return false
 * 4. Check channel quota → if not available, return false
 * 5. Return true
 * 
 * @param params - Conversation parameters
 * @returns true if AI is enabled, false otherwise
 */
export async function isAIEnabledForConversation(params: {
  channel: string;
}): Promise<boolean> {
  // 1. ENV Emergency Kill Switch (absolute priority)
  if (isAIEnvDisabled()) {
    return false;
  }

  // 2. DB Feature Flags
  const aiEnabled = await isFeatureEnabled('ai_enabled');
  if (!aiEnabled) {
    return false;
  }

  if (params.channel === 'whatsapp') {
    const aiWhatsAppEnabled = await isFeatureEnabled('ai_whatsapp_enabled');
    if (!aiWhatsAppEnabled) {
      return false;
    }
  }

  // 3. Channel Quota Gate
  const quota = await isAIQuotaAvailable({
    channel: params.channel,
  });
  if (!quota.allowed) {
    return false;
  }

  return true;
}
