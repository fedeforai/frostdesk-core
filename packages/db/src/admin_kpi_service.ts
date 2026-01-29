import { assertAdminAccess } from './admin_access.js';
import { getAdminKPISnapshot, type AdminKPISnapshot } from './admin_kpi_repository.js';

/**
 * Provides admin-guarded access to KPI snapshot.
 */
export async function getAdminKPISnapshotReadModel(
  params: { userId: string }
): Promise<AdminKPISnapshot> {
  await assertAdminAccess(params.userId);
  return getAdminKPISnapshot();
}
