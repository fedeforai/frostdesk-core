import { assertAdminAccess } from './admin_access.js';
import { getHumanInboxDetail } from './human_inbox_detail_repository.js';

export type HumanInboxDetail = NonNullable<ReturnType<typeof getHumanInboxDetail>>;

export async function getHumanInboxDetailReadModel(params: {
  conversationId: string;
  userId: string;
}): Promise<HumanInboxDetail | null> {
  await assertAdminAccess(params.userId);
  return getHumanInboxDetail(params.conversationId);
}
