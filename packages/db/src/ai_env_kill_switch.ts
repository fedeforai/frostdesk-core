/**
 * ENV Emergency AI Kill Switch
 * 
 * WHAT IT DOES:
 * - Checks environment variable AI_EMERGENCY_DISABLE
 * - Returns true if AI is disabled via ENV
 * 
 * WHAT IT DOES NOT DO:
 * - No DB access
 * - No validation
 * - No defaults
 * - No logging
 * 
 * Priority: ENV has absolute priority over DB flags
 * 
 * Variable: AI_EMERGENCY_DISABLE
 * Values:
 * - "true" → AI disabled
 * - anything else / undefined → ignored
 */
export function isAIEnvDisabled(): boolean {
  return process.env.AI_EMERGENCY_DISABLE === 'true';
}
