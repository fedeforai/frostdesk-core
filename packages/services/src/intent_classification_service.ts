import { classifyIntent } from '@frostdesk/ai';
import { saveMessageIntent } from '@frostdesk/db/src/message_intent_repository.js';

export async function classifyAndStoreIntent(input: {
  message_id: string;
  text: string;
  channel: 'whatsapp' | 'web';
}): Promise<void> {
  const { message_id, text, channel } = input;

  const classification = await classifyIntent({ text, channel });

  await saveMessageIntent({
    message_id,
    intent: classification.intent,
    confidence: classification.confidence,
    model: classification.model,
  });
}
