import { assertRoleAllowed } from './admin_access.js';
import { sendApprovedAIDraft } from './ai_draft_send_repository.js';

export async function approveAndSendAIDraft(params: {
  conversationId: string;
  userId: string;
}): Promise<{ message_id: string }> {
  // Assert role allowed (system_admin or human_approver)
  await assertRoleAllowed(params.userId, ['system_admin', 'human_approver']);

  return sendApprovedAIDraft({
    conversationId: params.conversationId,
    approvedBy: params.userId,
  });
}
