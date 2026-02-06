import { getFeatureFlag, assertAdminAccess } from '@frostdesk/db';

type Env = 'dev' | 'staging' | 'prod';

interface GetFeatureFlagStatusParams {
  key: string;
  env: Env;
  tenantId?: string;
}

/**
 * Gets feature flag status (admin-only).
 * Caller must pass a validated admin userId (e.g. from requireAdminUser).
 *
 * @param params - Feature flag parameters
 * @param userId - Validated admin user id (from JWT + DB check)
 * @returns Feature flag status
 * @throws UnauthorizedError if user is not an admin
 */
export async function getFeatureFlagStatus(
  params: GetFeatureFlagStatusParams,
  userId: string
): Promise<{ enabled: boolean }> {
  await assertAdminAccess(userId);

  const { key, env, tenantId } = params;

  const enabled = await getFeatureFlag(key, env, tenantId);

  return { enabled };
}
