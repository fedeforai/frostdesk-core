import { assertAdminAccess } from './admin_access.js';
import { getIntentConfidenceStats } from './intent_confidence_repository.js';

export async function getIntentConfidenceTelemetry(params: {
  userId: string;
  from?: string;
  to?: string;
}): Promise<Array<{
  bucket: 'low' | 'medium' | 'high';
  count: number;
}>> {
  await assertAdminAccess(params.userId);

  return getIntentConfidenceStats({
    from: params.from,
    to: params.to,
  });
}
