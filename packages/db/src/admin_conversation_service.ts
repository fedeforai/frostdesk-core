import { assertAdminAccess } from './admin_access.js';
import { listAllConversations, ConversationSummary, ListAllConversationsParams, listHumanInboxConversations, HumanInboxConversation, ListHumanInboxConversationsParams } from './admin_conversation_repository.js';

export interface GetAdminConversationsParams extends ListAllConversationsParams {
  userId: string;
}

/**
 * Retrieves conversations for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Call repository
 * 3. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of conversation summaries
 * @throws UnauthorizedError if user is not an admin
 */
export async function getAdminConversations(
  params: GetAdminConversationsParams
): Promise<ConversationSummary[]> {
  const { userId, ...queryParams } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Call repository
  return listAllConversations(queryParams);
}

export interface GetHumanInboxConversationsParams extends ListHumanInboxConversationsParams {
  userId: string;
}

/**
 * Retrieves human inbox conversations for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Call repository
 * 3. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of human inbox conversations
 * @throws UnauthorizedError if user is not an admin
 */
export async function getHumanInboxConversations(
  params: GetHumanInboxConversationsParams
): Promise<HumanInboxConversation[]> {
  const { userId, ...queryParams } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Call repository
  return listHumanInboxConversations(queryParams);
}
