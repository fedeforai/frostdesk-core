import { assertRoleAllowed } from './admin_access.js';
import { getSystemHealthSnapshot } from './system_health_repository.js';

/**
 * Retrieves system health snapshot for admin dashboard.
 * 
 * WHAT IT DOES:
 * - Asserts admin access
 * - Returns system health snapshot
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 */
export async function getSystemHealth(params: {
  userId: string;
}): Promise<ReturnType<typeof getSystemHealthSnapshot>> {
  // Assert role allowed (system_admin only)
  await assertRoleAllowed(params.userId, ['system_admin']);

  return getSystemHealthSnapshot();
}
