/**
 * Centralized Feature Flags Registry
 * 
 * PILOT MODE: All AI lifecycle features are disabled by default.
 * 
 * To re-enable AI lifecycle in the future:
 * - Set AI_LIFECYCLE_ENABLED to true
 * - Ensure ai_enabled column exists in conversations table
 * - Re-enable setConversationAIMode() in conversation_repository.ts
 */
export const FEATURE_FLAGS = {
  AI_LIFECYCLE_ENABLED: false, // PILOT MODE: AI lifecycle disabled
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
