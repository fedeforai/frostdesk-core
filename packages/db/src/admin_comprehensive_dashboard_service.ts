import { assertAdminAccess } from './admin_access.js';
import {
  getComprehensiveDashboard,
  type ComprehensiveDashboard,
} from './admin_comprehensive_dashboard_repository.js';

/**
 * Admin-guarded access to comprehensive dashboard metrics.
 */
export async function getComprehensiveDashboardReadModel(
  params: { userId: string },
): Promise<ComprehensiveDashboard> {
  await assertAdminAccess(params.userId);
  return getComprehensiveDashboard();
}
