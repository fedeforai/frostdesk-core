import { assertAdminAccess } from './admin_access.js';
import { saveAIDraft } from './ai_draft_repository.js';

/** Draft generator result: either a draft payload or ineligible. Injected by the API so db does not depend on api. */
export type GenerateDraftResult =
  | { text: string; model: string; created_at: string }
  | { eligible: false };

export async function generateAndStoreAIDraft(params: {
  conversationId: string;
  latestMessageText: string;
  userId: string;
  /** Injected by caller (e.g. API) so db has no dependency on api. */
  generateDraft: (opts: { conversationId: string; latestMessageText: string }) => Promise<GenerateDraftResult>;
}): Promise<{
  text: string;
  model: string;
  created_at: string;
}> {
  await assertAdminAccess(params.userId);

  const draft = await params.generateDraft({
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
