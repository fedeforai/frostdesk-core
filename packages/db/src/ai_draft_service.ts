import { assertAdminAccess } from './admin_access.js';
import { generateDraftReply } from '../../../apps/api/src/ai/generate_draft_reply.js';
import { saveAIDraft } from './ai_draft_repository.js';

export async function generateAndStoreAIDraft(params: {
  conversationId: string;
  latestMessageText: string;
  userId: string;
}): Promise<{
  text: string;
  model: string;
  created_at: string;
}> {
  await assertAdminAccess(params.userId);

  const draft = await generateDraftReply({
    conversationId: params.conversationId,
    latestMessageText: params.latestMessageText,
  });

  if ('eligible' in draft && draft.eligible === false) {
    throw new Error('AI is disabled');
  }

  // Type narrow: after guard above, draft has text/model/created_at
  const draftData = draft as { text: string; model: string; created_at: string };
  const savedDraft = await saveAIDraft({
    conversationId: params.conversationId,
    text: draftData.text,
    model: draftData.model,
    created_at: draftData.created_at,
  });

  return {
    text: savedDraft.text,
    model: savedDraft.model,
    created_at: savedDraft.created_at,
  };
}
