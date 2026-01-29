import { sql } from '@frostdesk/db/src/client.js';
import { isAIEnabledForConversation } from '@frostdesk/db/src/ai_global_gate.js';

export async function generateDraftReply(params: {
  conversationId: string;
  latestMessageText: string;
}): Promise<{
  text: string;
  model: string;
  created_at: string;
} | {
  eligible: false;
  reason: 'ai_disabled';
}> {
  const { conversationId, latestMessageText } = params;

  // AI GLOBAL GATE: Check kill switch
  const conversationResult = await sql<Array<{
    channel: string;
  }>>`
    SELECT channel
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;

  if (conversationResult.length > 0) {
    const channel = conversationResult[0].channel;
    const aiEnabled = await isAIEnabledForConversation({ channel });
    if (!aiEnabled) {
      return {
        eligible: false,
        reason: 'ai_disabled',
      };
    }
  }

  const text = `Thank you for your message. We've received it and will get back to you shortly.`;
  const model = 'gpt-4.1-mini';
  const created_at = new Date().toISOString();

  return {
    text,
    model,
    created_at,
  };
}
