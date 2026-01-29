import { getFeatureFlag } from '@frostdesk/db';
import { assertAdminAccess } from '../lib/assertAdminAccess.js';

type Env = 'dev' | 'staging' | 'prod';

interface GetFeatureFlagStatusParams {
  key: string;
  env: Env;
  tenantId?: string;
}

/**
 * Gets feature flag status (admin-only).
 * 
 * Rules:
 * - Admin guard always first
 * - Errors bubble up
 * - No silent fallbacks
 * - Minimal output
 * 
 * @param params - Feature flag parameters
 * @param request - Request context for admin check (optional, can extract userId from elsewhere)
 * @returns Feature flag status
 * @throws UnauthorizedError if user is not an admin
 */
export async function getFeatureFlagStatus(
  params: GetFeatureFlagStatusParams,
  request?: any
): Promise<{ enabled: boolean }> {
  // 🔐 admin guard upfront
  await assertAdminAccess(request);

  const { key, env, tenantId } = params;

  const enabled = await getFeatureFlag(key, env, tenantId);

  return { enabled };
}
