import { type FeatureFlagEnv } from '../../db/src/feature_flag_repository.js';
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
export declare function isFeatureEnabled(key: string, context?: FeatureFlagContext): Promise<boolean>;
//# sourceMappingURL=feature_flag_service.d.ts.map