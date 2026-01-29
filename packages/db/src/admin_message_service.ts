import { assertAdminAccess } from './admin_access.js';
import { listAllMessages, AdminMessageSummary, ListAllMessagesParams } from './admin_message_repository.js';

export interface GetAdminMessagesParams extends ListAllMessagesParams {
  userId: string;
}

/**
 * Retrieves messages for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Call repository
 * 3. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of message summaries
 * @throws UnauthorizedError if user is not an admin
 */
export async function getAdminMessages(
  params: GetAdminMessagesParams
): Promise<AdminMessageSummary[]> {
  const { userId, ...queryParams } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Call repository
  return listAllMessages(queryParams);
}
