import { assertAdminAccess } from './admin_access.js';
import { getSystemDegradationSignals } from './system_degradation_repository.js';

export async function getSystemDegradationSignalsReadModel(
  params: { userId: string }
): Promise<{
  webhook: {
    inbound_received_24h: number;
    inbound_errors_24h: number;
    last_error_at: string | null;
  };
  ai_drafts: {
    drafts_generated_24h: number;
    draft_errors_24h: number;
  };
  quota: {
    quota_exceeded_24h: number;
    last_quota_block_at: string | null;
  };
  escalation: {
    escalations_24h: number;
  };
}> {
  await assertAdminAccess(params.userId);

  return getSystemDegradationSignals();
}
