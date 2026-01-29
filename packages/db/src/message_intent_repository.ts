import { sql } from './client.js';

export async function saveMessageIntent(input: {
  message_id: string;
  intent: string;
  confidence: number;
  model: string;
}): Promise<void> {
  const { message_id, intent, confidence, model } = input;

  await sql`
    INSERT INTO message_metadata (message_id, key, value)
    VALUES (
      ${message_id},
      'intent_classification',
      ${JSON.stringify({
        intent,
        confidence,
        model,
        classified_at: new Date().toISOString(),
      })}::jsonb
    )
  `;
}
