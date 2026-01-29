import { getFeatureFlag } from '../../db/src/feature_flag_repository.js';
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
export async function isFeatureEnabled(key, context = {}) {
    // Resolve env: use context.env, or derive from NODE_ENV, or default to 'dev'
    let env;
    if (context.env) {
        env = context.env;
    }
    else {
        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv === 'production') {
            env = 'prod';
        }
        else if (nodeEnv === 'staging') {
            env = 'staging';
        }
        else {
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
//# sourceMappingURL=feature_flag_service.js.map