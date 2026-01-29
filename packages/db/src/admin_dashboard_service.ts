import { assertAdminAccess } from './admin_access.js';
import { getAdminDashboardMetrics, type AdminDashboardMetrics } from './admin_dashboard_repository.js';

/**
 * Provides admin-guarded access to dashboard metrics.
 */
export async function getAdminDashboardMetricsReadModel(
  params: { userId: string }
): Promise<AdminDashboardMetrics> {
  await assertAdminAccess(params.userId);
  return getAdminDashboardMetrics();
}
