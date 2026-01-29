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

  const savedDraft = await saveAIDraft({
    conversationId: params.conversationId,
    text: draft.text,
    model: draft.model,
    created_at: draft.created_at,
  });

  return {
    text: savedDraft.text,
    model: savedDraft.model,
    created_at: savedDraft.created_at,
  };
}
