import { getFeatureFlag, type FeatureFlagEnv } from './feature_flag_repository.js';

export interface FeatureFlagContext {
  env?: FeatureFlagEnv;
  tenantId?: string | null;
}

/**
 * Checks if a feature flag is enabled.
 * 
 * Logic:
 * - Resolves env from context or NODE_ENV (defaults to 'dev' if not set)
 * - Resolves tenant from context if present
 * - Flag missing = disabled (returns false)
 * - Returns enabled value if flag exists
 * 
 * @param key - Feature flag key
 * @param context - Context containing env and optional tenantId
 * @returns true if feature is enabled, false otherwise
 */
export async function isFeatureEnabled(
  key: string,
  context: FeatureFlagContext = {}
): Promise<boolean> {
  // Resolve env: use context.env, or derive from NODE_ENV, or default to 'dev'
  let env: FeatureFlagEnv;
  if (context.env) {
    env = context.env;
  } else {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      env = 'prod';
    } else if (nodeEnv === 'staging') {
      env = 'staging';
    } else {
      env = 'dev';
    }
  }

  // Resolve tenant from context
  const tenantId = context.tenantId;

  // Get feature flag
  const flag = await getFeatureFlag(key, env, tenantId);

  // Flag missing = disabled
  if (!flag) {
    return false;
  }

  return flag.enabled;
}
